import CoreMIDI
import ExpoModulesCore

// Local Expo module bridging iOS CoreMIDI input to JavaScript.
//
// - emits "onMessage" per MIDI message with { deviceId, bytes, timestamp } where
//   timestamp is milliseconds since an arbitrary epoch (monotonic).
// - emits "onDeviceChange" with { type: "added" | "removed", device } on hot-plug.
// - exposes getDevices() returning the current input device list.
//
// SysEx aggregation: CoreMIDI may split SysEx across packets. This module
// accumulates bytes from F0..F7 per source endpoint before emitting a single
// message.

public class CadenzaMidiModule: Module {
  private var midiClient: MIDIClientRef = 0
  private var inputPort: MIDIPortRef = 0
  private var connectedSources: Set<MIDIEndpointRef> = []
  private var sysexBuffers: [MIDIEndpointRef: [UInt8]] = [:]

  public func definition() -> ModuleDefinition {
    Name("CadenzaMidi")

    Events("onMessage", "onDeviceChange")

    OnCreate {
      self.setupMidi()
    }

    OnDestroy {
      self.teardownMidi()
    }

    Function("getDevices") { () -> [[String: Any]] in
      return self.enumerateDevices()
    }
  }

  // MARK: - setup / teardown

  private func setupMidi() {
    let notifyBlock: MIDINotifyBlock = { [weak self] notificationPointer in
      guard let self = self else { return }
      let notification = notificationPointer.pointee
      if notification.messageID == .msgSetupChanged {
        DispatchQueue.main.async { self.handleSetupChange() }
      }
    }

    let clientName = "Cadenza" as CFString
    var status = MIDIClientCreateWithBlock(clientName, &midiClient, notifyBlock)
    guard status == noErr else { return }

    let portName = "CadenzaInput" as CFString
    let readBlock: MIDIReadBlock = { [weak self] packetListPtr, srcConnRefCon in
      guard let self = self else { return }
      guard let refCon = srcConnRefCon else { return }
      let endpoint = MIDIEndpointRef(UInt32(bitPattern: Int32(Int(bitPattern: refCon) & 0xFFFFFFFF)))
      self.handlePacketList(packetListPtr.pointee, endpoint: endpoint)
    }

    status = MIDIInputPortCreateWithBlock(midiClient, portName, &inputPort, readBlock)
    guard status == noErr else { return }

    connectAllSources()
  }

  private func teardownMidi() {
    if inputPort != 0 { MIDIPortDispose(inputPort); inputPort = 0 }
    if midiClient != 0 { MIDIClientDispose(midiClient); midiClient = 0 }
    connectedSources.removeAll()
    sysexBuffers.removeAll()
  }

  // MARK: - device enumeration

  private func enumerateDevices() -> [[String: Any]] {
    var out: [[String: Any]] = []
    let count = MIDIGetNumberOfSources()
    for i in 0..<count {
      let source = MIDIGetSource(i)
      out.append(deviceInfoDict(for: source))
    }
    return out
  }

  private func deviceInfoDict(for endpoint: MIDIEndpointRef) -> [String: Any] {
    return [
      "id": deviceId(for: endpoint),
      "name": deviceName(for: endpoint),
      "transport": "unknown"
    ]
  }

  private func deviceId(for endpoint: MIDIEndpointRef) -> String {
    var uniqueId: Int32 = 0
    MIDIObjectGetIntegerProperty(endpoint, kMIDIPropertyUniqueID, &uniqueId)
    return String(uniqueId)
  }

  private func deviceName(for endpoint: MIDIEndpointRef) -> String {
    var name: Unmanaged<CFString>?
    let status = MIDIObjectGetStringProperty(endpoint, kMIDIPropertyDisplayName, &name)
    if status == noErr, let cf = name?.takeRetainedValue() {
      return cf as String
    }
    return "Unknown MIDI"
  }

  // MARK: - source connection lifecycle

  private func connectAllSources() {
    let count = MIDIGetNumberOfSources()
    for i in 0..<count {
      let source = MIDIGetSource(i)
      if !connectedSources.contains(source) {
        let refCon = UnsafeMutableRawPointer(bitPattern: Int(source))
        if MIDIPortConnectSource(inputPort, source, refCon) == noErr {
          connectedSources.insert(source)
          sendEvent("onDeviceChange", [
            "type": "added",
            "device": deviceInfoDict(for: source)
          ])
        }
      }
    }
  }

  private func handleSetupChange() {
    let currentSources = Set((0..<MIDIGetNumberOfSources()).map { MIDIGetSource($0) })
    // Removed sources: disconnect + emit
    for source in connectedSources.subtracting(currentSources) {
      let info = deviceInfoDict(for: source)
      MIDIPortDisconnectSource(inputPort, source)
      connectedSources.remove(source)
      sysexBuffers.removeValue(forKey: source)
      sendEvent("onDeviceChange", ["type": "removed", "device": info])
    }
    // New sources: connect + emit
    connectAllSources()
  }

  // MARK: - message dispatch

  private func handlePacketList(_ packetList: MIDIPacketList, endpoint: MIDIEndpointRef) {
    var packet = packetList.packet
    for _ in 0..<packetList.numPackets {
      let length = Int(packet.length)
      let bytes: [UInt8] = withUnsafeBytes(of: packet.data) { rawPtr in
        Array(rawPtr.prefix(length))
      }
      dispatchBytes(bytes, endpoint: endpoint, timestamp: packet.timeStamp)
      packet = MIDIPacketNext(&packet).pointee
    }
  }

  private func dispatchBytes(_ bytes: [UInt8], endpoint: MIDIEndpointRef, timestamp: UInt64) {
    var buffer = sysexBuffers[endpoint] ?? []
    var i = 0

    while i < bytes.count {
      let byte = bytes[i]

      if !buffer.isEmpty {
        buffer.append(byte)
        if byte == 0xF7 {
          emit(bytes: buffer, endpoint: endpoint, timestamp: timestamp)
          buffer = []
        }
        i += 1
        continue
      }

      if byte == 0xF0 {
        buffer = [0xF0]
        i += 1
        continue
      }

      let length = CadenzaMidiModule.shortMessageLength(forStatus: byte)
      let end = min(i + length, bytes.count)
      emit(bytes: Array(bytes[i..<end]), endpoint: endpoint, timestamp: timestamp)
      i = end
    }

    if buffer.isEmpty {
      sysexBuffers.removeValue(forKey: endpoint)
    } else {
      sysexBuffers[endpoint] = buffer
    }
  }

  private static func shortMessageLength(forStatus status: UInt8) -> Int {
    let high = status & 0xF0
    switch high {
    case 0x80, 0x90, 0xA0, 0xB0, 0xE0: return 3
    case 0xC0, 0xD0: return 2
    case 0xF0:
      switch status {
      case 0xF1, 0xF3: return 2
      case 0xF2: return 3
      case 0xF6, 0xF8, 0xFA, 0xFB, 0xFC, 0xFE, 0xFF: return 1
      default: return 1
      }
    default: return 1
    }
  }

  private func emit(bytes: [UInt8], endpoint: MIDIEndpointRef, timestamp: UInt64) {
    // MIDITimeStamp is mach_absolute_time; convert to milliseconds.
    let ms = Double(timestamp) / 1_000_000.0
    sendEvent("onMessage", [
      "deviceId": deviceId(for: endpoint),
      "bytes": bytes.map { Int($0) },
      "timestamp": ms
    ])
  }
}
