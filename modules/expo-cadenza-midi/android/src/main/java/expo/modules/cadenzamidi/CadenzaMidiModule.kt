package expo.modules.cadenzamidi

import android.content.Context
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.media.midi.MidiOutputPort
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Local Expo module bridging Android MidiManager input to JavaScript.
 *
 * - emits "onMessage" per MIDI message with { deviceId, bytes, timestamp } where
 *   timestamp is milliseconds since an arbitrary epoch (monotonic).
 * - emits "onDeviceChange" with { type: "added" | "removed", device } on hot-plug.
 * - exposes getDevices() returning the current input device list.
 *
 * SysEx aggregation: MidiManager packets can split SysEx mid-stream. This module
 * accumulates bytes from F0..F7 per source device before emitting a single message.
 */
class CadenzaMidiModule : Module() {
  private var midiManager: MidiManager? = null
  private val openDevices: MutableMap<Int, MidiDevice> = mutableMapOf()
  private val openPorts: MutableMap<Int, MutableList<MidiOutputPort>> = mutableMapOf()
  private val sysexBuffers: MutableMap<Int, MutableList<Byte>> = mutableMapOf()
  private val mainHandler = Handler(Looper.getMainLooper())

  private val deviceCallback = object : MidiManager.DeviceCallback() {
    override fun onDeviceAdded(info: MidiDeviceInfo) {
      openDevice(info)
    }

    override fun onDeviceRemoved(info: MidiDeviceInfo) {
      closeDevice(info)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("CadenzaMidi")

    Events("onMessage", "onDeviceChange")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      val mgr = context.getSystemService(Context.MIDI_SERVICE) as? MidiManager ?: return@OnCreate
      midiManager = mgr
      for (info in mgr.devices) {
        openDevice(info)
      }
      mgr.registerDeviceCallback(deviceCallback, mainHandler)
    }

    OnDestroy {
      midiManager?.unregisterDeviceCallback(deviceCallback)
      for ((_, ports) in openPorts) {
        for (port in ports) {
          try { port.close() } catch (_: Throwable) {}
        }
      }
      openPorts.clear()
      for ((_, device) in openDevices) {
        try { device.close() } catch (_: Throwable) {}
      }
      openDevices.clear()
      sysexBuffers.clear()
      midiManager = null
    }

    Function("getDevices") {
      return@Function midiManager?.devices?.map { deviceInfoToMap(it) } ?: emptyList<Map<String, Any?>>()
    }
  }

  private fun deviceInfoToMap(info: MidiDeviceInfo): Map<String, Any?> {
    val name = info.properties.getString(MidiDeviceInfo.PROPERTY_NAME)
      ?: info.properties.getString(MidiDeviceInfo.PROPERTY_PRODUCT)
      ?: "Unknown MIDI"
    val transport = when (info.type) {
      MidiDeviceInfo.TYPE_USB -> "usb"
      MidiDeviceInfo.TYPE_BLUETOOTH -> "bluetooth"
      MidiDeviceInfo.TYPE_VIRTUAL -> "virtual"
      else -> "unknown"
    }
    return mapOf(
      "id" to info.id.toString(),
      "name" to name,
      "transport" to transport,
    )
  }

  private fun openDevice(info: MidiDeviceInfo) {
    val mgr = midiManager ?: return
    if (openDevices.containsKey(info.id)) return

    mgr.openDevice(info, { device ->
      if (device == null) return@openDevice
      val id = info.id
      openDevices[id] = device

      val ports = mutableListOf<MidiOutputPort>()
      for (portIndex in 0 until info.outputPortCount) {
        val port = device.openOutputPort(portIndex) ?: continue
        val receiver = object : MidiReceiver() {
          override fun onSend(msg: ByteArray?, offset: Int, count: Int, timestampNs: Long) {
            if (msg == null) return
            val bytes = msg.copyOfRange(offset, offset + count)
            dispatchBytes(bytes, id, timestampNs)
          }
        }
        port.connect(receiver)
        ports.add(port)
      }
      openPorts[id] = ports

      sendEvent("onDeviceChange", mapOf(
        "type" to "added",
        "device" to deviceInfoToMap(info),
      ))
    }, mainHandler)
  }

  private fun closeDevice(info: MidiDeviceInfo) {
    val id = info.id
    val device = openDevices.remove(id) ?: return
    openPorts.remove(id)?.forEach { try { it.close() } catch (_: Throwable) {} }
    sysexBuffers.remove(id)
    try { device.close() } catch (_: Throwable) {}
    sendEvent("onDeviceChange", mapOf(
      "type" to "removed",
      "device" to deviceInfoToMap(info),
    ))
  }

  private fun dispatchBytes(bytes: ByteArray, deviceId: Int, timestampNs: Long) {
    val buffer = sysexBuffers[deviceId] ?: mutableListOf()

    var i = 0
    while (i < bytes.size) {
      val b = bytes[i].toInt() and 0xFF

      if (buffer.isNotEmpty()) {
        buffer.add(bytes[i])
        if (b == 0xF7) {
          emit(buffer.toByteArray(), deviceId, timestampNs)
          buffer.clear()
        }
        i++
        continue
      }

      if (b == 0xF0) {
        buffer.add(bytes[i])
        i++
        continue
      }

      val length = shortMessageLength(b)
      val end = minOf(i + length, bytes.size)
      emit(bytes.copyOfRange(i, end), deviceId, timestampNs)
      i = end
    }

    if (buffer.isEmpty()) {
      sysexBuffers.remove(deviceId)
    } else {
      sysexBuffers[deviceId] = buffer
    }
  }

  private fun shortMessageLength(status: Int): Int {
    return when (status and 0xF0) {
      0x80, 0x90, 0xA0, 0xB0, 0xE0 -> 3
      0xC0, 0xD0 -> 2
      0xF0 -> when (status) {
        0xF1, 0xF3 -> 2
        0xF2 -> 3
        else -> 1
      }
      else -> 1
    }
  }

  private fun emit(bytes: ByteArray, deviceId: Int, timestampNs: Long) {
    val ms = timestampNs.toDouble() / 1_000_000.0
    sendEvent("onMessage", mapOf(
      "deviceId" to deviceId.toString(),
      "bytes" to bytes.map { it.toInt() and 0xFF },
      "timestamp" to ms,
    ))
  }
}
