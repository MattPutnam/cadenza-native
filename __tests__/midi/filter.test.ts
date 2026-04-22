import { shouldDeliver } from '../../src/midi/filter';
import type { MidiMessage } from '../../src/midi/types';
import type { Preferences } from '../../src/prefs/schema';

const base = { deviceId: 'test', timestamp: 0 };

const noteOn: MidiMessage = { ...base, type: 'noteOn', channel: 1, note: 60, velocity: 100 };
const sysex: MidiMessage = {
  ...base,
  type: 'sysex',
  bytes: Uint8Array.from([0xf0, 0x01, 0xf7]),
};
const clock: MidiMessage = { ...base, type: 'clock' };
const activeSensing: MidiMessage = { ...base, type: 'activeSensing' };
const systemReset: MidiMessage = { ...base, type: 'systemReset' };

function prefs(sysex: boolean, realTime: boolean): Preferences {
  return { ignoreSysEx: sysex, ignoreSystemRealTime: realTime };
}

describe('shouldDeliver', () => {
  describe('when both filters are OFF', () => {
    const p = prefs(false, false);
    it('delivers Note On', () => expect(shouldDeliver(noteOn, p)).toBe(true));
    it('delivers SysEx', () => expect(shouldDeliver(sysex, p)).toBe(true));
    it('delivers Clock', () => expect(shouldDeliver(clock, p)).toBe(true));
    it('delivers Active Sensing', () => expect(shouldDeliver(activeSensing, p)).toBe(true));
    it('delivers System Reset', () => expect(shouldDeliver(systemReset, p)).toBe(true));
  });

  describe('when only ignoreSysEx is ON', () => {
    const p = prefs(true, false);
    it('delivers Note On', () => expect(shouldDeliver(noteOn, p)).toBe(true));
    it('drops SysEx', () => expect(shouldDeliver(sysex, p)).toBe(false));
    it('delivers Clock', () => expect(shouldDeliver(clock, p)).toBe(true));
    it('delivers Active Sensing', () => expect(shouldDeliver(activeSensing, p)).toBe(true));
    it('delivers System Reset', () => expect(shouldDeliver(systemReset, p)).toBe(true));
  });

  describe('when only ignoreSystemRealTime is ON', () => {
    const p = prefs(false, true);
    it('delivers Note On', () => expect(shouldDeliver(noteOn, p)).toBe(true));
    it('delivers SysEx', () => expect(shouldDeliver(sysex, p)).toBe(true));
    it('drops Clock', () => expect(shouldDeliver(clock, p)).toBe(false));
    it('drops Active Sensing', () => expect(shouldDeliver(activeSensing, p)).toBe(false));
    it('drops System Reset', () => expect(shouldDeliver(systemReset, p)).toBe(false));
  });

  describe('when both filters are ON', () => {
    const p = prefs(true, true);
    it('delivers Note On', () => expect(shouldDeliver(noteOn, p)).toBe(true));
    it('drops SysEx', () => expect(shouldDeliver(sysex, p)).toBe(false));
    it('drops Clock', () => expect(shouldDeliver(clock, p)).toBe(false));
    it('drops Active Sensing', () => expect(shouldDeliver(activeSensing, p)).toBe(false));
    it('drops System Reset', () => expect(shouldDeliver(systemReset, p)).toBe(false));
  });
});
