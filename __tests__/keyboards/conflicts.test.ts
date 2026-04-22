import { detectConflicts } from '../../src/keyboards/conflicts';
import { newDefaultKeyboard } from '../../src/keyboards/schema';
import type { Keyboard } from '../../src/keyboards/types';

function kb(overrides: Partial<Keyboard>): Keyboard {
  return { ...newDefaultKeyboard(), ...overrides };
}

describe('detectConflicts', () => {
  it('returns an empty set for an empty list', () => {
    expect(Array.from(detectConflicts([]))).toEqual([]);
  });

  it('returns an empty set for a single keyboard', () => {
    expect(Array.from(detectConflicts([kb({ deviceName: 'X', channel: 1 })]))).toEqual([]);
  });

  it('includes both ids when two keyboards share device and channel', () => {
    const a = kb({ id: 'a', deviceName: 'Roland', channel: 1 });
    const b = kb({ id: 'b', deviceName: 'Roland', channel: 1 });
    expect(Array.from(detectConflicts([a, b])).sort()).toEqual(['a', 'b']);
  });

  it('does not flag same device with different channels', () => {
    const a = kb({ id: 'a', deviceName: 'Roland', channel: 1 });
    const b = kb({ id: 'b', deviceName: 'Roland', channel: 2 });
    expect(Array.from(detectConflicts([a, b]))).toEqual([]);
  });

  it('flags all three ids when three keyboards share device and channel', () => {
    const a = kb({ id: 'a', deviceName: 'Roland', channel: 1 });
    const b = kb({ id: 'b', deviceName: 'Roland', channel: 1 });
    const c = kb({ id: 'c', deviceName: 'Roland', channel: 1 });
    const result = Array.from(detectConflicts([a, b, c])).sort();
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('ignores keyboards with null deviceName', () => {
    const a = kb({ id: 'a', deviceName: null, channel: 1 });
    const b = kb({ id: 'b', deviceName: null, channel: 1 });
    expect(Array.from(detectConflicts([a, b]))).toEqual([]);
  });

  it('ignores keyboards with null channel', () => {
    const a = kb({ id: 'a', deviceName: 'Roland', channel: null });
    const b = kb({ id: 'b', deviceName: 'Roland', channel: null });
    expect(Array.from(detectConflicts([a, b]))).toEqual([]);
  });

  it('differentiates conflicts by device', () => {
    const a = kb({ id: 'a', deviceName: 'Roland', channel: 1 });
    const b = kb({ id: 'b', deviceName: 'Roland', channel: 1 }); // conflicts with a
    const c = kb({ id: 'c', deviceName: 'Arturia', channel: 1 }); // clean
    expect(Array.from(detectConflicts([a, b, c])).sort()).toEqual(['a', 'b']);
  });
});
