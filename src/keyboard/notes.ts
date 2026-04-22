import type { KeyColor } from './types';

const WHITE_KEY_CLASSES: ReadonlySet<number> = new Set([0, 2, 4, 5, 7, 9, 11]);

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

/** True if the MIDI note is a white key (C, D, E, F, G, A, or B). */
export function isWhiteKey(midi: number): boolean {
  return WHITE_KEY_CLASSES.has(pitchClass(midi));
}

export function keyColor(midi: number): KeyColor {
  return isWhiteKey(midi) ? 'white' : 'black';
}

/** Count of white keys in the inclusive MIDI range [low, high]. Returns 0 if low > high. */
export function whiteKeyCount(low: number, high: number): number {
  if (low > high) return 0;
  let count = 0;
  for (let n = low; n <= high; n++) {
    if (isWhiteKey(n)) count++;
  }
  return count;
}

/**
 * MIDI note number to scientific pitch notation (C-1 = 0, C4 = 60, C8 = 108).
 * The input is not validated — the only consumer is the component itself,
 * which has already validated its props.
 */
export function toNoteName(midi: number): string {
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${octave}`;
}
