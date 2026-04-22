# Data Model: Keyboard Display Component

**Feature**: `004-keyboard-view`
**Date**: 2026-04-22

This feature introduces no persisted data, no contexts, and no subscriptions. The "data model" here is a set of value types and a pure layout function that drive the component's rendering.

---

## KeyColor (value type)

Classifies a key as white or black based on its MIDI pitch class.

```ts
// src/keyboard/types.ts
export type KeyColor = 'white' | 'black';
```

### Derivation

```ts
// src/keyboard/notes.ts
const WHITE_KEY_CLASSES: ReadonlySet<number> = new Set([0, 2, 4, 5, 7, 9, 11]);

export function isWhiteKey(midi: number): boolean {
  return WHITE_KEY_CLASSES.has(((midi % 12) + 12) % 12);
}

export function keyColor(midi: number): KeyColor {
  return isWhiteKey(midi) ? 'white' : 'black';
}
```

### Invariants

1. Every MIDI note number (integer in `[0, 127]`) has exactly one `KeyColor`.
2. Non-integer or out-of-range inputs are programming errors; helpers do not coerce.

---

## KeyDescriptor (value type)

Describes one rendered key with everything the render path needs.

```ts
// src/keyboard/types.ts
export interface KeyDescriptor {
  midi: number;           // 0..127
  color: KeyColor;
  x: number;              // left edge in the keyboard's local coordinate space (pt)
  y: number;              // top edge in the keyboard's local coordinate space (pt) — always 0 in this feature
  width: number;          // key width in pt
  height: number;         // key height in pt
  highlighted: boolean;   // resolved from the Keyboard's highlighted-midi list
}
```

### Invariants

1. `x >= 0`, `width > 0`, `height > 0` for every rendered descriptor.
2. White-key descriptors never overlap: if `a` and `b` are consecutive white keys, `a.x + a.width === b.x` (to the floating-point precision the renderer emits).
3. Black-key descriptors overlay white keys: for every black key `b`, there exist two flanking white keys `w1` and `w2` with `w1.x + w1.width === w2.x` and `b.x + b.width / 2 === w1.x + w1.width`.
4. `highlighted === true` iff `midi` is in the caller's `highlighted` list AND `midi ∈ [low, high]`.
5. Descriptors are ordered: white keys in ascending `midi`, then black keys in ascending `midi` (so blacks render on top of whites).

---

## KeyboardLayout (value type)

The full computed layout returned by the pure layout function.

```ts
// src/keyboard/types.ts
export interface KeyboardLayout {
  keys: readonly KeyDescriptor[];
  width: number;   // total keyboard width = containerWidth (or 0 if containerWidth <= 0)
  height: number;  // total keyboard height (derived from W * KEY_ASPECT)
  error: KeyboardLayoutError | null;
}

export type KeyboardLayoutError =
  | 'low-not-white-key'
  | 'high-not-white-key'
  | 'low-greater-than-high'
  | 'out-of-midi-range';
```

### Computation

```ts
// src/keyboard/layout.ts
const KEY_ASPECT = 5.5;                  // height:width ratio for a white key
const BLACK_KEY_WIDTH_RATIO = 0.6;       // black / white
const BLACK_KEY_HEIGHT_RATIO = 0.62;     // black height / white height

export function computeKeyboardLayout(
  low: number,
  high: number,
  containerWidth: number,
): KeyboardLayout {
  // 1. Validate the caller's contract. Return `{ error, keys: [] }` without throwing.
  //    low integer in [0, 127]; high integer in [0, 127]; low <= high;
  //    low is a white key; high is a white key.
  // 2. Count white keys in [low, high] inclusive.
  // 3. W = containerWidth / whiteKeyCount.
  //    H = W * KEY_ASPECT.
  // 4. Emit white-key descriptors left-to-right at x = i * W.
  // 5. For each black key `b` in [low, high], emit at
  //    x = (index of b's left neighbor white key + 1) * W - (BLACK_KEY_WIDTH_RATIO * W) / 2.
  // 6. Return { keys, width: containerWidth, height: H, error: null }.
}
```

### Invariants

1. For any valid input where `containerWidth > 0`, the returned `keys` array has exactly `(whiteKeyCount + blackKeyCount)` entries (count of notes in range).
2. `containerWidth <= 0` produces `{ keys: [], width: 0, height: 0, error: null }`. The component treats this as "not measured yet."
3. `error !== null` produces `{ keys: [], ... }` — the component uses the error value to decide whether to render the error placeholder.
4. The function is pure: same inputs produce identical outputs across calls; no I/O, no global state, no `Math.random`, no time access.

---

## KeyboardProps (API boundary)

```ts
// src/keyboard/types.ts
export interface KeyboardProps {
  /** MIDI note number of the lowest key to render. MUST be a white key. */
  low: number;
  /** MIDI note number of the highest key to render. MUST be a white key. */
  high: number;
  /** MIDI note numbers to render with the highlight color. Out-of-range entries are silently ignored. Order and duplicates do not matter. */
  highlighted?: readonly number[];
  /** Optional testID forwarded to the root View (for testing only). */
  testID?: string;
  /** Optional override for the root View's a11y label. If omitted, the component generates one from props. */
  accessibilityLabel?: string;
}
```

### Contract notes

- `highlighted` defaults to `[]` when omitted.
- `testID` defaults to `"keyboard"`.
- The component has **no** `style` or `width`/`height` props — it always fills its container horizontally and self-sizes vertically from its computed layout. Consumers constrain size from the parent.

---

## Note naming (for the a11y label only)

```ts
// src/keyboard/notes.ts
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export function toNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1; // MIDI 60 = C4
  return `${NOTE_NAMES[pitchClass]}${octave}`;
}
```

### Invariants

- `toNoteName(60) === 'C4'`, `toNoteName(21) === 'A0'`, `toNoteName(108) === 'C8'`.
- Non-integer or out-of-range input produces an arbitrary-but-non-crashing string; helpers do not validate their inputs (the only consumer is the component itself, which has already validated).

---

## Relationships

```
KeyboardProps ──► computeKeyboardLayout(low, high, containerWidth) ──► KeyboardLayout
                                                                           │
                                                                           ├── keys: KeyDescriptor[]  ──► render
                                                                           └── error?                 ──► error placeholder
```

`KeyboardProps` is the external API. `KeyboardLayout` is the internal reduction that the render path iterates. Both are plain value types with no classes, no hooks, no React dependencies — they can be consumed by tests directly.

---

## Not modeled

- **Persistence**: none. No AsyncStorage keys introduced.
- **State machine**: the component is stateless (beyond the measured `width` state). There are no transitions to model.
- **Per-user preferences**: none. The keyboard has no user-configurable visual settings.
- **Note-theory abstractions**: deliberately minimal. We expose `isWhiteKey`, `keyColor`, `whiteKeyCount`, `toNoteName`. Chord detection, scale logic, enharmonic spelling, etc., are not part of this feature.
- **MIDI message types**: the component consumes note numbers, not `MidiMessage` objects. Future features that want to highlight "all currently held notes" can extract note numbers from `MidiMessage` themselves.
