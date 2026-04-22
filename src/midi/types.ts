// Domain types for the MIDI subsystem.
//
// `MidiMessage` is a discriminated union on `type`. TypeScript's exhaustiveness
// checking across parser, filter, and format relies on this being the single
// source of truth — do NOT loosen `type` to `string` anywhere downstream.

export type MidiChannel =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type MidiTransport = 'usb' | 'bluetooth' | 'virtual' | 'unknown';

export interface MidiDevice {
  readonly id: string;
  readonly name: string;
  readonly transport: MidiTransport;
}

interface Base {
  readonly deviceId: string;
  /** Receive timestamp in milliseconds since an arbitrary monotonic epoch. */
  readonly timestamp: number;
}

export type MidiMessage =
  | (Base & { type: 'noteOn';          channel: MidiChannel; note: number; velocity: number })
  | (Base & { type: 'noteOff';         channel: MidiChannel; note: number; velocity: number })
  | (Base & { type: 'controlChange';   channel: MidiChannel; controller: number; value: number })
  | (Base & { type: 'programChange';   channel: MidiChannel; program: number })
  | (Base & { type: 'pitchBend';       channel: MidiChannel; value: number })
  | (Base & { type: 'channelPressure'; channel: MidiChannel; pressure: number })
  | (Base & { type: 'polyAftertouch';  channel: MidiChannel; note: number; pressure: number })
  | (Base & { type: 'sysex';           bytes: Uint8Array })
  | (Base & { type: 'clock' })
  | (Base & { type: 'start' })
  | (Base & { type: 'continue' })
  | (Base & { type: 'stop' })
  | (Base & { type: 'activeSensing' })
  | (Base & { type: 'systemReset' })
  | (Base & { type: 'unknown'; bytes: Uint8Array });

export type MidiMessageType = MidiMessage['type'];

/** All MIDI message types whose wire representation includes a channel (1–16). */
export type ChannelScopedMessage = Extract<MidiMessage, { channel: MidiChannel }>;

/** All System Real-Time message types (covered by the `ignoreSystemRealTime` filter). */
export type SystemRealTimeType =
  | 'clock' | 'start' | 'continue' | 'stop' | 'activeSensing' | 'systemReset';

export function isSystemRealTime(msg: MidiMessage): boolean {
  switch (msg.type) {
    case 'clock':
    case 'start':
    case 'continue':
    case 'stop':
    case 'activeSensing':
    case 'systemReset':
      return true;
    default:
      return false;
  }
}
