import {
  BLACK_KEY_HEIGHT_RATIO,
  BLACK_KEY_WIDTH_RATIO,
  KEY_ASPECT,
  computeKeyboardLayout,
} from '../../src/keyboard/layout';
import { isWhiteKey } from '../../src/keyboard/notes';

describe('computeKeyboardLayout', () => {
  describe('success case — C3..C5 @ 700pt', () => {
    const layout = computeKeyboardLayout(48, 72, 700);

    it('returns 25 total descriptors (15 white + 10 black) with no error', () => {
      expect(layout.error).toBeNull();
      expect(layout.keys).toHaveLength(25);
      expect(layout.keys.filter((k) => k.color === 'white')).toHaveLength(15);
      expect(layout.keys.filter((k) => k.color === 'black')).toHaveLength(10);
    });

    it('sets keyboard width to the container and derives height from KEY_ASPECT', () => {
      expect(layout.width).toBe(700);
      const whiteWidth = 700 / 15;
      expect(layout.height).toBeCloseTo(whiteWidth * KEY_ASPECT, 6);
    });

    it('white keys are equal-width and contiguous in ascending MIDI', () => {
      const whites = layout.keys.filter((k) => k.color === 'white');
      whites.sort((a, b) => a.midi - b.midi);
      const W = whites[0].width;
      for (let i = 0; i < whites.length - 1; i++) {
        expect(whites[i + 1].width).toBeCloseTo(W, 6);
        expect(whites[i + 1].x).toBeCloseTo(whites[i].x + whites[i].width, 6);
      }
    });

    it('each black key is centered on the boundary between its two flanking white keys', () => {
      const blacks = layout.keys.filter((k) => k.color === 'black');
      const whites = layout.keys.filter((k) => k.color === 'white');
      for (const b of blacks) {
        const leftWhite = whites.find((w) => w.midi === b.midi - 1);
        const rightWhite = whites.find((w) => w.midi === b.midi + 1);
        expect(leftWhite).toBeDefined();
        expect(rightWhite).toBeDefined();
        const boundaryX = leftWhite!.x + leftWhite!.width;
        expect(b.x + b.width / 2).toBeCloseTo(boundaryX, 6);
      }
    });

    it('black keys are narrower and shorter than white keys per the ratios', () => {
      const whites = layout.keys.filter((k) => k.color === 'white');
      const blacks = layout.keys.filter((k) => k.color === 'black');
      const W = whites[0].width;
      const H = whites[0].height;
      for (const b of blacks) {
        expect(b.width).toBeCloseTo(W * BLACK_KEY_WIDTH_RATIO, 6);
        expect(b.height).toBeCloseTo(H * BLACK_KEY_HEIGHT_RATIO, 6);
      }
    });

    it('no highlights when highlighted list is empty', () => {
      expect(layout.keys.every((k) => !k.highlighted)).toBe(true);
    });

    it('highlights only the in-range entries of the caller list', () => {
      const withHighlights = computeKeyboardLayout(48, 72, 700, [60, 64, 67, 200]);
      const highlighted = withHighlights.keys.filter((k) => k.highlighted);
      expect(highlighted.map((k) => k.midi).sort()).toEqual([60, 64, 67]);
    });
  });

  describe('zero-width (not-yet-measured)', () => {
    it('returns empty keys and no error when containerWidth === 0', () => {
      const layout = computeKeyboardLayout(48, 72, 0);
      expect(layout.keys).toEqual([]);
      expect(layout.width).toBe(0);
      expect(layout.height).toBe(0);
      expect(layout.error).toBeNull();
    });

    it('returns empty keys and no error when containerWidth is negative', () => {
      const layout = computeKeyboardLayout(48, 72, -50);
      expect(layout.keys).toEqual([]);
      expect(layout.error).toBeNull();
    });
  });

  describe('error cases', () => {
    it('low-not-white-key: low=49 (C#)', () => {
      expect(computeKeyboardLayout(49, 72, 500).error).toBe('low-not-white-key');
    });

    it('high-not-white-key: high=71 is B4 (white) — use 70 (A#4) to force error', () => {
      expect(computeKeyboardLayout(48, 70, 500).error).toBe('high-not-white-key');
    });

    it('low-greater-than-high', () => {
      expect(computeKeyboardLayout(72, 48, 500).error).toBe('low-greater-than-high');
    });

    it('out-of-midi-range: low < 0', () => {
      expect(computeKeyboardLayout(-1, 72, 500).error).toBe('out-of-midi-range');
    });

    it('out-of-midi-range: high > 127', () => {
      expect(computeKeyboardLayout(48, 128, 500).error).toBe('out-of-midi-range');
    });

    it('out-of-midi-range: non-integer input', () => {
      expect(computeKeyboardLayout(48.5, 72, 500).error).toBe('out-of-midi-range');
    });
  });

  describe('SC-004 — full 88-key piano at 320pt (minimum phone width)', () => {
    const layout = computeKeyboardLayout(21, 108, 320);

    it('renders all 88 keys (52 white + 36 black) with no error', () => {
      expect(layout.error).toBeNull();
      expect(layout.keys).toHaveLength(88);
      expect(layout.keys.filter((k) => k.color === 'white')).toHaveLength(52);
      expect(layout.keys.filter((k) => k.color === 'black')).toHaveLength(36);
    });

    it('every key has strictly positive width and height', () => {
      for (const k of layout.keys) {
        expect(k.width).toBeGreaterThan(0);
        expect(k.height).toBeGreaterThan(0);
      }
    });

    it('consecutive white keys do not overlap', () => {
      const whites = layout.keys.filter((k) => k.color === 'white');
      whites.sort((a, b) => a.midi - b.midi);
      for (let i = 0; i < whites.length - 1; i++) {
        expect(whites[i + 1].x).toBeGreaterThanOrEqual(whites[i].x + whites[i].width - 1e-6);
      }
    });
  });

  describe('MIDI extremes', () => {
    it('supports low === 0 (C-1, a white key)', () => {
      const layout = computeKeyboardLayout(0, 12, 500);
      expect(layout.error).toBeNull();
      expect(layout.keys.some((k) => k.midi === 0 && k.color === 'white')).toBe(true);
    });

    it('high === 127 is a programming error because 127 is G9 — it IS a white key', () => {
      // Confirm 127 is white (sanity check for the test we are about to run).
      expect(isWhiteKey(127)).toBe(true);
      const layout = computeKeyboardLayout(0, 127, 1000);
      expect(layout.error).toBeNull();
      expect(layout.keys).toHaveLength(128);
    });
  });

  describe('single-key range', () => {
    it('low === high (white) renders exactly one key', () => {
      const layout = computeKeyboardLayout(60, 60, 100);
      expect(layout.error).toBeNull();
      expect(layout.keys).toHaveLength(1);
      expect(layout.keys[0].midi).toBe(60);
      expect(layout.keys[0].color).toBe('white');
      expect(layout.keys[0].width).toBe(100);
    });
  });

  describe('dedup in highlighted list', () => {
    it('duplicates in the highlighted list produce exactly one highlighted key', () => {
      const layout = computeKeyboardLayout(48, 72, 700, [60, 60, 60]);
      expect(layout.keys.filter((k) => k.highlighted)).toHaveLength(1);
    });
  });
});
