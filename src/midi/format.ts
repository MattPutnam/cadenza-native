import type { MidiMessage } from './types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Convert a MIDI note number (0..127) to a note name using middle-C = C4
 * (Yamaha / GM convention): MIDI 60 → "C4".
 */
function noteName(midi: number): string {
  const pitch = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${pitch}${octave}`;
}

function hexByte(b: number): string {
  return b.toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Render a MIDI message as a concise one-line string suitable for the activity
 * display. Pure function.
 */
export function formatMidiMessage(msg: MidiMessage): string {
  switch (msg.type) {
    case 'noteOn':
      return `NoteOn  ch ${msg.channel}  ${noteName(msg.note)}  v${msg.velocity}`;
    case 'noteOff':
      return `NoteOff ch ${msg.channel}  ${noteName(msg.note)}  v${msg.velocity}`;
    case 'controlChange':
      return `CC      ch ${msg.channel}  #${msg.controller}  v${msg.value}`;
    case 'programChange':
      return `PC      ch ${msg.channel}  #${msg.program}`;
    case 'pitchBend':
      return `Pitch   ch ${msg.channel}  ${msg.value}`;
    case 'channelPressure':
      return `Pressure ch ${msg.channel}  v${msg.pressure}`;
    case 'polyAftertouch':
      return `PolyAT  ch ${msg.channel}  ${noteName(msg.note)}  v${msg.pressure}`;
    case 'sysex':
      return `SysEx   (${msg.bytes.length} bytes)`;
    case 'clock':
      return 'Clock';
    case 'start':
      return 'Start';
    case 'continue':
      return 'Continue';
    case 'stop':
      return 'Stop';
    case 'activeSensing':
      return 'Active Sensing';
    case 'systemReset':
      return 'System Reset';
    case 'unknown':
      return `Unknown 0x${hexByte(msg.bytes[0] ?? 0)}`;
  }
}
