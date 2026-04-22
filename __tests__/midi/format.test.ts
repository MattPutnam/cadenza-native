import { formatMidiMessage } from '../../src/midi/format';
import type { MidiMessage } from '../../src/midi/types';

const base = { deviceId: 'test', timestamp: 0 };

describe('formatMidiMessage', () => {
  it('Note On includes type, channel, note name, velocity', () => {
    const msg: MidiMessage = { ...base, type: 'noteOn', channel: 1, note: 60, velocity: 100 };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Nn]ote ?[Oo]n/);
    expect(out).toContain('1');
    expect(out).toContain('C4');
    expect(out).toContain('100');
  });

  it('Note Off includes type, channel, note name, velocity', () => {
    const msg: MidiMessage = { ...base, type: 'noteOff', channel: 2, note: 72, velocity: 64 };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Nn]ote ?[Oo]ff/);
    expect(out).toContain('2');
    expect(out).toContain('C5');
    expect(out).toContain('64');
  });

  it('Control Change includes controller and value', () => {
    const msg: MidiMessage = {
      ...base,
      type: 'controlChange',
      channel: 1,
      controller: 7,
      value: 127,
    };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/CC|[Cc]ontrol ?[Cc]hange/);
    expect(out).toContain('7');
    expect(out).toContain('127');
  });

  it('Program Change includes program number', () => {
    const msg: MidiMessage = { ...base, type: 'programChange', channel: 1, program: 42 };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/PC|[Pp]rogram/);
    expect(out).toContain('42');
  });

  it('Pitch Bend includes value', () => {
    const msg: MidiMessage = { ...base, type: 'pitchBend', channel: 1, value: -8192 };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Pp]itch/);
    expect(out).toContain('-8192');
  });

  it('Channel Pressure includes pressure', () => {
    const msg: MidiMessage = {
      ...base,
      type: 'channelPressure',
      channel: 1,
      pressure: 90,
    };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Pp]ressure|AT|CP/);
    expect(out).toContain('90');
  });

  it('Polyphonic Aftertouch includes note and pressure', () => {
    const msg: MidiMessage = {
      ...base,
      type: 'polyAftertouch',
      channel: 1,
      note: 60,
      pressure: 50,
    };
    const out = formatMidiMessage(msg);
    expect(out).toContain('C4');
    expect(out).toContain('50');
  });

  it('SysEx includes the word "SysEx" and a byte count', () => {
    const msg: MidiMessage = {
      ...base,
      type: 'sysex',
      bytes: Uint8Array.from([0xf0, 0x41, 0x10, 0x42, 0xf7]),
    };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Ss]ys[Ee]x/);
    expect(out).toContain('5');
  });

  it('System Real-Time messages include a type label', () => {
    expect(formatMidiMessage({ ...base, type: 'clock' })).toMatch(/[Cc]lock/);
    expect(formatMidiMessage({ ...base, type: 'start' })).toMatch(/[Ss]tart/);
    expect(formatMidiMessage({ ...base, type: 'continue' })).toMatch(/[Cc]ontinue/);
    expect(formatMidiMessage({ ...base, type: 'stop' })).toMatch(/[Ss]top/);
    expect(formatMidiMessage({ ...base, type: 'activeSensing' })).toMatch(
      /[Aa]ctive ?[Ss]ensing/,
    );
    expect(formatMidiMessage({ ...base, type: 'systemReset' })).toMatch(
      /[Ss]ystem ?[Rr]eset/,
    );
  });

  it('Unknown messages include the word "Unknown" and a hex first byte', () => {
    const msg: MidiMessage = {
      ...base,
      type: 'unknown',
      bytes: Uint8Array.from([0xf4, 0x00]),
    };
    const out = formatMidiMessage(msg);
    expect(out).toMatch(/[Uu]nknown/);
    expect(out.toLowerCase()).toContain('f4');
  });
});
