import { isWhiteKey, whiteKeyCount } from './notes';
import type { KeyDescriptor, KeyboardLayout, KeyboardLayoutError } from './types';

/** White-key height:width ratio (keyboard's overall height = white-key width × KEY_ASPECT). */
export const KEY_ASPECT = 5.5;
/** Black-key width as a fraction of the white-key width. */
export const BLACK_KEY_WIDTH_RATIO = 0.6;
/** Black-key height as a fraction of the white-key (full) height. */
export const BLACK_KEY_HEIGHT_RATIO = 0.62;

function validate(
  low: number,
  high: number,
): KeyboardLayoutError | null {
  if (!Number.isInteger(low) || !Number.isInteger(high) || low < 0 || high > 127) {
    return 'out-of-midi-range';
  }
  if (low > high) return 'low-greater-than-high';
  if (!isWhiteKey(low)) return 'low-not-white-key';
  if (!isWhiteKey(high)) return 'high-not-white-key';
  return null;
}

/**
 * Pure: compute the positions and dimensions of every key in [low, high]
 * inclusive, sized to `containerWidth`. Never throws — validation failures
 * return a non-null `error` and an empty `keys` array.
 *
 * A `containerWidth` of 0 (or any non-positive number) is treated as
 * "not yet measured" — returns empty keys but no error.
 */
export function computeKeyboardLayout(
  low: number,
  high: number,
  containerWidth: number,
  highlighted: readonly number[] = [],
): KeyboardLayout {
  const error = validate(low, high);
  if (error !== null) {
    return { keys: [], width: 0, height: 0, error };
  }
  if (containerWidth <= 0) {
    return { keys: [], width: 0, height: 0, error: null };
  }

  const whiteCount = whiteKeyCount(low, high);
  const whiteWidth = containerWidth / whiteCount;
  const keyboardHeight = whiteWidth * KEY_ASPECT;
  const blackWidth = whiteWidth * BLACK_KEY_WIDTH_RATIO;
  const blackHeight = keyboardHeight * BLACK_KEY_HEIGHT_RATIO;

  // Resolve highlights to a Set for O(1) lookup; dedup is implicit.
  const highlightedSet = new Set(highlighted);

  const whites: KeyDescriptor[] = [];
  const blacks: KeyDescriptor[] = [];

  // First pass: emit white-key descriptors left-to-right; also remember each
  // white key's index within the range so we can position black keys by their
  // *left neighbor*'s index.
  const whiteIndexByMidi = new Map<number, number>();
  {
    let i = 0;
    for (let midi = low; midi <= high; midi++) {
      if (!isWhiteKey(midi)) continue;
      whites.push({
        midi,
        color: 'white',
        x: i * whiteWidth,
        y: 0,
        width: whiteWidth,
        height: keyboardHeight,
        highlighted: highlightedSet.has(midi),
      });
      whiteIndexByMidi.set(midi, i);
      i++;
    }
  }

  // Second pass: emit black-key descriptors. Each black key has a white
  // neighbor immediately below it (midi - 1). Its horizontal center lies on
  // the boundary between that neighbor and the next white key (midi + 1).
  for (let midi = low; midi <= high; midi++) {
    if (isWhiteKey(midi)) continue;
    const leftWhiteIndex = whiteIndexByMidi.get(midi - 1);
    if (leftWhiteIndex === undefined) continue; // shouldn't happen given a white boundary, but be defensive
    const boundaryX = (leftWhiteIndex + 1) * whiteWidth;
    blacks.push({
      midi,
      color: 'black',
      x: boundaryX - blackWidth / 2,
      y: 0,
      width: blackWidth,
      height: blackHeight,
      highlighted: highlightedSet.has(midi),
    });
  }

  return {
    keys: [...whites, ...blacks],
    width: containerWidth,
    height: keyboardHeight,
    error: null,
  };
}
