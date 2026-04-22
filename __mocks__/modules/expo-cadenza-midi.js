// Jest mock for modules/expo-cadenza-midi.
//
// Exposes the same public API as the real facade (getDevices /
// subscribeToMessages / observeDevices) plus test-only helpers
// (__fireMessage / __fireDeviceChange / __reset) for driving synthetic
// MIDI traffic inside Jest. The real module needs a Dev Client build with
// the native CoreMIDI / MidiManager code; tests never invoke the native path.

let devices = [];
const messageListeners = new Set();
const deviceListeners = new Set();

function getDevices() {
  return devices.slice();
}

function subscribeToMessages(listener) {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

function observeDevices(listener) {
  deviceListeners.add(listener);
  return () => {
    deviceListeners.delete(listener);
  };
}

// --- test-only helpers ---

function __fireMessage(bytes, deviceId = 'test-device-1', timestamp = 0) {
  const payload = {
    deviceId,
    bytes: Array.isArray(bytes) ? bytes.slice() : Array.from(bytes),
    timestamp,
  };
  // Snapshot listeners so listeners removing themselves mid-dispatch is safe.
  const snapshot = Array.from(messageListeners);
  for (const l of snapshot) {
    try {
      l(payload);
    } catch {
      // listener failures do not break the loop
    }
  }
}

function __fireDeviceChange(event) {
  const snapshot = Array.from(deviceListeners);
  for (const l of snapshot) {
    try {
      l(event);
    } catch {
      // listener failures do not break the loop
    }
  }
  if (event.type === 'added') {
    if (!devices.find((d) => d.id === event.device.id)) {
      devices.push(event.device);
    }
  } else if (event.type === 'removed') {
    devices = devices.filter((d) => d.id !== event.device.id);
  }
}

function __setDevices(list) {
  devices = list.slice();
}

function __reset() {
  devices = [];
  messageListeners.clear();
  deviceListeners.clear();
}

module.exports = {
  getDevices,
  subscribeToMessages,
  observeDevices,
  __fireMessage,
  __fireDeviceChange,
  __setDevices,
  __reset,
};
