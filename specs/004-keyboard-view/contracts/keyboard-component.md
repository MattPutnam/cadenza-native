# Component Contract: Keyboard

**Feature**: `004-keyboard-view`
**Date**: 2026-04-22

This contract pins the observable surface of the `<Keyboard />` component and the Storybook workshop: testIDs, accessibility, props, what tests must assert, and the theme tokens the component depends on.

---

## 1. Component signature

```ts
// src/keyboard/Keyboard.tsx
import type { KeyboardProps } from './types';

export function Keyboard(props: KeyboardProps): JSX.Element;
```

`KeyboardProps` is defined in `src/keyboard/types.ts` and documented in `data-model.md` §KeyboardProps.

---

## 2. Render surface — success case

When all inputs are valid and `containerWidth > 0`:

- Root element: a `<View>` with `testID` equal to the `testID` prop (default `"keyboard"`), `accessibilityRole="image"`, `accessibilityLabel` equal to the `accessibilityLabel` prop or a generated description.
- Direct children: one `<View>` per `KeyDescriptor`, each with:
  - `testID` of the form `"keyboard-key-<midi>"` (e.g., `"keyboard-key-60"` for Middle C).
  - `style` that includes the computed `x`, `y`, `width`, `height`, and either `backgroundColor: keyboardWhiteKey` or `keyboardBlackKey` — unless the key is highlighted, in which case `backgroundColor: keyboardHighlight`.
  - `pointerEvents="none"` (the keys are strictly decorative in this feature).
- Key ordering in the render tree: all white keys first (ascending MIDI), then all black keys (ascending MIDI). This ensures black keys visually overlay the white keys they flank.
- The root `<View>` uses `width: '100%'` and captures its layout via `onLayout`.

---

## 3. Render surface — error case

When `computeKeyboardLayout` returns a non-null `error`:

- Root element still present with the same `testID` and `accessibilityRole`.
- Instead of the key Views, renders a single `<View>` with `testID="keyboard-error"` containing a `<Text>` with `testID="keyboard-error-message"` whose content starts with `"Keyboard: invalid range"`.
- In `__DEV__` only, a `console.warn` is emitted with the offending prop values and error code.
- The root does **not** throw.

---

## 4. Accessibility label (default generator)

When `accessibilityLabel` prop is omitted, the generator produces:

```
Keyboard, range <low note name> to <high note name>, <N> highlighted<optional list tail>
```

Where:
- `<low note name>` is `toNoteName(low)` (e.g., `"C3"`).
- `<high note name>` is `toNoteName(high)`.
- `<N>` is the count of highlighted notes that fall inside the range (out-of-range highlights ignored).
- `<optional list tail>` is:
  - empty string when `N === 0`,
  - `": <note names...>"` for up to 5 highlighted notes,
  - `": <first 5 note names>, and <N-5> more"` when `N > 5`.

Examples:

- `low=48, high=72, highlighted=[]` → `"Keyboard, range C3 to C5, 0 highlighted"`
- `low=48, high=72, highlighted=[60]` → `"Keyboard, range C3 to C5, 1 highlighted: C4"`
- `low=48, high=72, highlighted=[60, 64, 67]` → `"Keyboard, range C3 to C5, 3 highlighted: C4, E4, G4"`
- `low=21, high=108, highlighted=[all 88 notes]` → `"Keyboard, range A0 to C8, 88 highlighted: A0, A#0, B0, C1, C#1, and 83 more"`

---

## 5. testIDs

| ID                              | Element                                                     |
|---------------------------------|-------------------------------------------------------------|
| `keyboard`                      | Root View (default; overridable via `testID` prop).         |
| `keyboard-key-<midi>`           | One per rendered key.                                       |
| `keyboard-error`                | Error placeholder View (only when layout returns an error). |
| `keyboard-error-message`        | The error `<Text>` inside `keyboard-error`.                 |

---

## 6. Behavior contracts (tests that must exist)

### `notes.ts`

| Contract                                                                         | Test file                              |
|----------------------------------------------------------------------------------|----------------------------------------|
| `isWhiteKey(60) === true` (C4)                                                   | `__tests__/keyboard/notes.test.ts`     |
| `isWhiteKey(61) === false` (C#4)                                                 | same                                   |
| `isWhiteKey(n)` is true for every n where `n % 12 ∈ {0,2,4,5,7,9,11}`            | same                                   |
| `whiteKeyCount(48, 72) === 15` (C3..C5 inclusive, 2 octaves + root = 14+1 white) | same                                   |
| `whiteKeyCount(21, 108) === 52` (full 88-key piano)                              | same                                   |
| `whiteKeyCount(60, 60) === 1` (single white key)                                 | same                                   |
| `toNoteName(60) === 'C4'`; `toNoteName(21) === 'A0'`; `toNoteName(108) === 'C8'` | same                                   |

### `layout.ts`

| Contract                                                                                       | Test file                              |
|------------------------------------------------------------------------------------------------|----------------------------------------|
| `computeKeyboardLayout(48, 72, 700)` returns `25` descriptors (15 white + 10 black) with `error === null`. | `__tests__/keyboard/layout.test.ts`    |
| White keys are equal-width and contiguous: `w[i+1].x === w[i].x + w[i].width`.                 | same                                   |
| Every black key is centered on the boundary between its two flanking white keys.               | same                                   |
| `computeKeyboardLayout(48, 72, 0)` returns `{ keys: [], width: 0, height: 0, error: null }` — not-yet-measured. | same                                   |
| `computeKeyboardLayout(61, 72, 500)` returns `error === 'low-not-white-key'` with empty keys.  | same                                   |
| `computeKeyboardLayout(48, 71, 500)` returns `error === 'high-not-white-key'` with empty keys. | same                                   |
| `computeKeyboardLayout(72, 48, 500)` returns `error === 'low-greater-than-high'`.              | same                                   |
| `computeKeyboardLayout(-1, 72, 500)` or `computeKeyboardLayout(48, 128, 500)` returns `error === 'out-of-midi-range'`. | same                                   |

### `Keyboard.tsx`

| Contract                                                                                                 | Test file                                 |
|----------------------------------------------------------------------------------------------------------|-------------------------------------------|
| Renders root `testID="keyboard"` (or the caller's override).                                             | `__tests__/keyboard/Keyboard.test.tsx`    |
| After simulating an `onLayout` with width=700, renders 25 key `testID`s for range 48..72.                | same                                      |
| Key with `midi=60` has highlight background when `highlighted=[60]`; key with `midi=64` does not.        | same                                      |
| Out-of-range highlights (`highlighted=[200]` with range 48..72) do NOT render any key in highlight color. | same                                      |
| Black-key boundary (`low=61`) produces `keyboard-error` placeholder and suppresses key rendering.        | same                                      |
| Root `accessibilityLabel` matches the generator (default case with 0 highlights and with 3 highlights).  | same                                      |
| Caller-supplied `accessibilityLabel` overrides the generator.                                            | same                                      |
| No key has `onPress` attached (component is display-only).                                               | same                                      |

---

## 7. Theme tokens (additive)

Added to `src/theme/colors.ts`:

| Token                | Purpose                                    | Contrast requirement                                                 |
|----------------------|--------------------------------------------|----------------------------------------------------------------------|
| `keyboardWhiteKey`   | Fill color of white keys.                  | ≥ 3:1 against `surface` (UI component contrast, WCAG AA).            |
| `keyboardBlackKey`   | Fill color of black keys.                  | ≥ 3:1 against `surface` (so black keys are visible, not hidden).     |
| `keyboardHighlight`  | Fill color of highlighted keys (blue).     | ≥ 4.5:1 against `keyboardWhiteKey` AND against `keyboardBlackKey`.   |

Existing tokens reused: `surface`, `border`. No existing token value changes.

---

## 8. Storybook workshop contract

### Entry point

- `index.ts` branches on `process.env.EXPO_PUBLIC_STORYBOOK === 'true'` and renders either the real `App` or the `StorybookApp` from `.storybook/index.tsx`.
- `npm run storybook` sets the env var and starts Metro.
- `npm run storybook:generate` regenerates `.storybook/storybook.requires.ts`.

### Stories (file: `src/keyboard/Keyboard.stories.tsx`)

Exactly one default export naming the story group `"Components/Keyboard"` and the following named exports (one per story):

| Story export name           | low  | high | highlighted           | Wrapper width             | Story label in UI           |
|-----------------------------|------|------|-----------------------|---------------------------|-----------------------------|
| `FullPiano`                 | 21   | 108  | `[]`                  | default (full width)      | "Full 88-key piano"         |
| `MiddleCHighlighted`        | 48   | 72   | `[60]`                | default                   | "Middle C highlighted"      |
| `CMajorChord`               | 48   | 72   | `[60, 64, 67]`        | default                   | "C major chord"             |
| `ChromaticSelection`        | 48   | 72   | `[60, 61, 62, 63, 64]`| default                   | "Chromatic selection"       |
| `EmptyHighlights`           | 48   | 72   | `[]`                  | default                   | "Empty highlights"          |
| `OneOctaveRange`            | 60   | 72   | `[60, 72]`            | default                   | "One octave (root + octave)"|
| `NarrowContainer`           | 48   | 72   | `[60, 64, 67]`        | 320 pt fixed              | "Narrow container (320 pt)" |
| `WideContainer`             | 48   | 72   | `[60, 64, 67]`        | 1000 pt fixed (scrollable container if device is narrower) | "Wide container (1000 pt)" |

### Story invariants

- Each story MUST render without throwing.
- Each story MUST render the exact prop combination described in its row above — no randomized props, no network calls, no timing-sensitive state.
- Stories MUST NOT require any provider the app has (ModeProvider, PreferencesProvider, etc.). The keyboard component has no context dependencies, so stories remain minimal and portable.

---

## 9. Out of scope for this contract

- Tap / press handlers on keys (deferred; would be an additive optional prop).
- Note name labels drawn on the keys themselves (deferred).
- Audio playback, pitch highlighting via live MIDI input, or animations.
- Per-key custom colors beyond the single `highlighted` state.
- Internationalization of the a11y label (English only).
- Web Storybook via `react-native-web`.
- Visual regression testing (Chromatic, Percy) — possible later, not required here.
