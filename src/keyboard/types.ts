/**
 * Types for the Keyboard display component.
 *
 * The component renders a range of piano keys (white + black) filling its
 * container width; see spec specs/004-keyboard-view/spec.md and data-model.md.
 */

export type KeyColor = 'white' | 'black';

export type KeyboardLayoutError =
  | 'low-not-white-key'
  | 'high-not-white-key'
  | 'low-greater-than-high'
  | 'out-of-midi-range';

export interface KeyDescriptor {
  /** MIDI note number (0..127). */
  midi: number;
  color: KeyColor;
  /** Left edge in the keyboard's local coordinate space (pt). */
  x: number;
  /** Top edge in the keyboard's local coordinate space (pt). Always 0 in this feature. */
  y: number;
  /** Key width in pt. */
  width: number;
  /** Key height in pt. */
  height: number;
  /** Whether the caller's `highlighted` list selected this key. */
  highlighted: boolean;
}

export interface KeyboardLayout {
  keys: readonly KeyDescriptor[];
  /** Total keyboard width (== containerWidth when valid, else 0). */
  width: number;
  /** Total keyboard height, derived from the layout. */
  height: number;
  /** Non-null when input is invalid; keys will be empty in that case. */
  error: KeyboardLayoutError | null;
}

export interface KeyboardProps {
  /** MIDI note number of the lowest key to render. MUST be a white key. */
  low: number;
  /** MIDI note number of the highest key to render. MUST be a white key. */
  high: number;
  /**
   * MIDI note numbers to render with the highlight color. Out-of-range entries
   * are silently ignored. Order and duplicates do not matter.
   */
  highlighted?: readonly number[];
  /** Optional testID forwarded to the root View (for testing only). */
  testID?: string;
  /** Optional override for the root View's a11y label. If omitted, the component generates one from props. */
  accessibilityLabel?: string;
}
