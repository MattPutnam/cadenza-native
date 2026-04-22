import { isWhiteKey } from '../../src/keyboard/notes';
import {
  displayName,
  newDefaultKeyboard,
  newId,
} from '../../src/keyboards/schema';
import { BUILT_IN_KEYBOARD_SIZES, type Keyboard } from '../../src/keyboards/types';

describe('keyboards schema', () => {
  describe('BUILT_IN_KEYBOARD_SIZES', () => {
    it('lists the standard plus alternate ranges in ascending key count, then low', () => {
      expect(BUILT_IN_KEYBOARD_SIZES).toEqual([
        { low: 48, high: 72 },    // 25 keys  C3-C5
        { low: 48, high: 84 },    // 37 keys  C3-C6
        { low: 36, high: 84 },    // 49 keys  C2-C6
        { low: 48, high: 96 },    // 49 keys  C3-C7
        { low: 29, high: 89 },    // 61 keys  F1-F6
        { low: 36, high: 96 },    // 61 keys  C2-C7
        { low: 28, high: 100 },   // 73 keys  E1-E7
        { low: 28, high: 103 },   // 76 keys  E1-G7
        { low: 33, high: 108 },   // 76 keys  A1-C8
        { low: 21, high: 108 },   // 88 keys  A0-C8
      ]);
    });

    it('every preset range starts and ends on a white key', () => {
      for (const r of BUILT_IN_KEYBOARD_SIZES) {
        expect(isWhiteKey(r.low)).toBe(true);
        expect(isWhiteKey(r.high)).toBe(true);
      }
    });

    it('every preset key count is one of 25/37/49/61/73/76/88', () => {
      const allowed = new Set([25, 37, 49, 61, 73, 76, 88]);
      for (const r of BUILT_IN_KEYBOARD_SIZES) {
        expect(allowed.has(r.high - r.low + 1)).toBe(true);
      }
    });

    it('presets are sorted by (keyCount, low) ascending', () => {
      let prevCount = -1;
      let prevLow = -Infinity;
      for (const r of BUILT_IN_KEYBOARD_SIZES) {
        const count = r.high - r.low + 1;
        if (count === prevCount) {
          expect(r.low).toBeGreaterThan(prevLow);
        } else {
          expect(count).toBeGreaterThan(prevCount);
          prevCount = count;
        }
        prevLow = r.low;
      }
    });

    it('no two presets have the same (low, high)', () => {
      const seen = new Set<string>();
      for (const r of BUILT_IN_KEYBOARD_SIZES) {
        const key = `${r.low}-${r.high}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    });
  });

  describe('newId', () => {
    it('returns a non-empty string', () => {
      expect(typeof newId()).toBe('string');
      expect(newId().length).toBeGreaterThan(0);
    });

    it('produces unique ids across invocations', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) ids.add(newId());
      expect(ids.size).toBe(50);
    });
  });

  describe('newDefaultKeyboard', () => {
    it('returns the 88-key range (A0..C8) with all other fields null and a fresh id', () => {
      const a = newDefaultKeyboard();
      const b = newDefaultKeyboard();
      expect(a.lowKey).toBe(21);
      expect(a.highKey).toBe(108);
      expect(a.deviceName).toBeNull();
      expect(a.channel).toBeNull();
      expect(a.nickname).toBeNull();
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('displayName', () => {
    function kb(nickname: string | null): Keyboard {
      return { ...newDefaultKeyboard(), nickname };
    }

    it('returns "Keyboard N" (1-indexed) when nickname is null', () => {
      expect(displayName(kb(null), 0)).toBe('Keyboard 1');
      expect(displayName(kb(null), 2)).toBe('Keyboard 3');
    });

    it('returns "Keyboard N" when nickname is empty string', () => {
      expect(displayName(kb(''), 0)).toBe('Keyboard 1');
    });

    it('returns the nickname verbatim when non-empty', () => {
      expect(displayName(kb('Upper'), 0)).toBe('Upper');
      expect(displayName(kb('Rhodes 73'), 4)).toBe('Rhodes 73');
    });
  });
});
