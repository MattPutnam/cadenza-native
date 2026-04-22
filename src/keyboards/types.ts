/**
 * Types for the Setup-tab Keyboards feature.
 *
 * A `Keyboard` is a user-configured entry representing one physical MIDI
 * controller. See data-model.md in specs/005-setup-keyboards/ for invariants.
 */

export interface KeyboardRange {
  /** MIDI note number of the lowest key (white key). */
  readonly low: number;
  /** MIDI note number of the highest key (white key). */
  readonly high: number;
}

/**
 * Built-in keyboard-size presets offered in the size dropdown. Each entry is
 * a (low, high) MIDI range. Labels (e.g., "88 keys (A0-C8)") are derived at
 * render time from the range. Custom ranges (outside this list) are
 * represented the same way in `Keyboard` — no enum gate on `lowKey`/`highKey`.
 *
 * Same-key-count variants are included where a common commercial range
 * differs from the canonical one (e.g., Yamaha arranger 76-key A1-C8 vs.
 * stage-piano 76-key E1-G7). Order is ascending by key count, then by low.
 */
export const BUILT_IN_KEYBOARD_SIZES: readonly KeyboardRange[] = [
  { low: 48, high: 72 },    // 25 keys, C3 .. C5
  { low: 48, high: 84 },    // 37 keys, C3 .. C6
  { low: 36, high: 84 },    // 49 keys, C2 .. C6  (standard 49-key controllers)
  { low: 48, high: 96 },    // 49 keys, C3 .. C7  (Korg microKEY / other mini-key 49s)
  { low: 29, high: 89 },    // 61 keys, F1 .. F6  (Fatar / organ-style 61s)
  { low: 36, high: 96 },    // 61 keys, C2 .. C7  (standard 61-key controllers)
  { low: 28, high: 100 },   // 73 keys, E1 .. E7  (Rhodes 73, Nord Electro/Stage 73)
  { low: 28, high: 103 },   // 76 keys, E1 .. G7  (stage-piano 76-key)
  { low: 33, high: 108 },   // 76 keys, A1 .. C8  (Yamaha arranger / PSR / DGX 76s)
  { low: 21, high: 108 },   // 88 keys, A0 .. C8
];

export interface Keyboard {
  readonly id: string;
  /** MIDI note number of the lowest key. White-key contract. */
  readonly lowKey: number;
  /** MIDI note number of the highest key. White-key contract. */
  readonly highKey: number;
  readonly deviceName: string | null;
  readonly channel: number | null;
  readonly nickname: string | null;
}

/** Shape of the persisted AsyncStorage blob. */
export interface StoredSetup {
  readonly version: 1;
  readonly keyboards: readonly Keyboard[];
}
