import {
  isWhiteKey,
  keyColor,
  toNoteName,
  whiteKeyCount,
} from '../../src/keyboard/notes';

describe('notes helpers', () => {
  describe('isWhiteKey', () => {
    it('returns true for every white pitch class in octave 4', () => {
      expect(isWhiteKey(60)).toBe(true); // C4
      expect(isWhiteKey(62)).toBe(true); // D4
      expect(isWhiteKey(64)).toBe(true); // E4
      expect(isWhiteKey(65)).toBe(true); // F4
      expect(isWhiteKey(67)).toBe(true); // G4
      expect(isWhiteKey(69)).toBe(true); // A4
      expect(isWhiteKey(71)).toBe(true); // B4
    });

    it('returns false for every black pitch class in octave 4', () => {
      expect(isWhiteKey(61)).toBe(false); // C#4
      expect(isWhiteKey(63)).toBe(false); // D#4
      expect(isWhiteKey(66)).toBe(false); // F#4
      expect(isWhiteKey(68)).toBe(false); // G#4
      expect(isWhiteKey(70)).toBe(false); // A#4
    });

    it('agrees with keyColor', () => {
      expect(keyColor(60)).toBe('white');
      expect(keyColor(61)).toBe('black');
    });

    it('is correct at MIDI extremes', () => {
      expect(isWhiteKey(0)).toBe(true); // C-1
      expect(isWhiteKey(21)).toBe(true); // A0
      expect(isWhiteKey(108)).toBe(true); // C8
      expect(isWhiteKey(127)).toBe(true); // G9
    });
  });

  describe('whiteKeyCount', () => {
    it('counts 15 white keys in C3..C5 (MIDI 48..72)', () => {
      expect(whiteKeyCount(48, 72)).toBe(15);
    });

    it('counts 52 white keys in A0..C8 (the full 88-key piano)', () => {
      expect(whiteKeyCount(21, 108)).toBe(52);
    });

    it('counts 1 when low === high and that note is white', () => {
      expect(whiteKeyCount(60, 60)).toBe(1);
    });

    it('counts 0 when low > high', () => {
      expect(whiteKeyCount(72, 48)).toBe(0);
    });

    it('counts 8 white keys in C4..C5 (one octave + upper root)', () => {
      expect(whiteKeyCount(60, 72)).toBe(8);
    });
  });

  describe('toNoteName', () => {
    it('formats canonical pitches correctly', () => {
      expect(toNoteName(60)).toBe('C4');
      expect(toNoteName(21)).toBe('A0');
      expect(toNoteName(108)).toBe('C8');
      expect(toNoteName(0)).toBe('C-1');
      expect(toNoteName(69)).toBe('A4');
      expect(toNoteName(61)).toBe('C#4');
    });
  });
});
