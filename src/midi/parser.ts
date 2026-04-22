import type { MidiChannel, MidiMessage } from './types';

/**
 * Parse raw MIDI bytes into a typed `MidiMessage`.
 *
 * Pure function; no I/O, no allocations beyond the returned object. Unrecognized
 * or truncated status bytes fall through to `{ type: 'unknown' }` rather than
 * throwing — the MIDI hot path must never raise.
 */
export function parseMidiMessage(
  bytes: Uint8Array,
  deviceId: string,
  timestamp: number,
): MidiMessage {
  if (bytes.length === 0) {
    return { type: 'unknown', bytes, deviceId, timestamp };
  }
  const status = bytes[0];
  const high = status & 0xf0;

  if (high === 0x80 || high === 0x90 || high === 0xa0 || high === 0xb0 || high === 0xe0) {
    const channel = ((status & 0x0f) + 1) as MidiChannel;
    const d1 = bytes[1] ?? 0;
    const d2 = bytes[2] ?? 0;

    if (high === 0x80) {
      return { type: 'noteOff', channel, note: d1, velocity: d2, deviceId, timestamp };
    }
    if (high === 0x90) {
      // Running-status convention: a Note On with velocity 0 is a Note Off.
      if (d2 === 0) {
        return { type: 'noteOff', channel, note: d1, velocity: 0, deviceId, timestamp };
      }
      return { type: 'noteOn', channel, note: d1, velocity: d2, deviceId, timestamp };
    }
    if (high === 0xa0) {
      return { type: 'polyAftertouch', channel, note: d1, pressure: d2, deviceId, timestamp };
    }
    if (high === 0xb0) {
      return { type: 'controlChange', channel, controller: d1, value: d2, deviceId, timestamp };
    }
    // Pitch Bend: 14-bit value with LSB=d1, MSB=d2, converted to signed -8192..8191
    const wireValue = (d2 << 7) | d1;
    const value = wireValue - 8192;
    return { type: 'pitchBend', channel, value, deviceId, timestamp };
  }

  if (high === 0xc0 || high === 0xd0) {
    const channel = ((status & 0x0f) + 1) as MidiChannel;
    const d1 = bytes[1] ?? 0;
    if (high === 0xc0) {
      return { type: 'programChange', channel, program: d1, deviceId, timestamp };
    }
    return { type: 'channelPressure', channel, pressure: d1, deviceId, timestamp };
  }

  // System messages (0xF0 family).
  switch (status) {
    case 0xf0:
      return { type: 'sysex', bytes, deviceId, timestamp };
    case 0xf8:
      return { type: 'clock', deviceId, timestamp };
    case 0xfa:
      return { type: 'start', deviceId, timestamp };
    case 0xfb:
      return { type: 'continue', deviceId, timestamp };
    case 0xfc:
      return { type: 'stop', deviceId, timestamp };
    case 0xfe:
      return { type: 'activeSensing', deviceId, timestamp };
    case 0xff:
      return { type: 'systemReset', deviceId, timestamp };
    default:
      return { type: 'unknown', bytes, deviceId, timestamp };
  }
}
