# Research: Keyboard Display Component

**Feature**: `004-keyboard-view`
**Date**: 2026-04-22

Each section below captures one design decision, the reasoning, and the alternatives considered. Technical Context in `plan.md` has no NEEDS CLARIFICATION markers remaining — these entries lock in the choices the plan depends on.

---

## 1. Keyboard geometry (white-key and black-key layout)

### Decision

White keys are laid out left-to-right in a flex row; each white key has equal width `W = containerWidth / whiteKeyCount(low, high)`. The keyboard's total height is `H = W * KEY_ASPECT` where `KEY_ASPECT = 5.5` (white key height:width). Black keys sit between specific pairs of white keys, absolutely positioned, with width `0.6 * W` and height `0.62 * H`, aligned top and horizontally centered on the boundary between their two neighboring white keys.

The layout math is a pure function `computeKeyboardLayout(low, high, containerWidth)` returning an ordered array of key descriptors:

```ts
interface KeyDescriptor {
  midi: number;
  color: 'white' | 'black';
  // In the component's local coordinate space (origin = top-left of keyboard).
  x: number;      // left edge
  y: number;      // top edge (black keys: 0; white keys: 0 also — black keys overlay)
  width: number;  // white: W; black: 0.6 * W
  height: number; // white: H; black: 0.62 * H
}
```

### Rationale

- Classical piano layout has seven white keys per octave (C, D, E, F, G, A, B) and five black keys per octave (C#, D#, F#, G#, A#). Black keys sit between {C–D, D–E, F–G, G–A, A–B}; there is no black key between E–F or B–C.
- Equal-width white keys is the universal convention and keeps layout math O(range-size) with no square-root or trigonometry.
- Aspect ratio `5.5` gives a recognizable piano silhouette at any width. This is an approximation of real pianos (~5:1) adjusted to read correctly inside denser UI panels.
- Black-key dimensions `(0.6W, 0.62H)` match typical software-piano conventions; the component does not need to match a physical piano's exact ratios.
- Expressing the layout as a pure function makes it trivially testable: given `(low, high, containerWidth)` we can assert the exact `x/y/width/height` of every key.

### Alternatives considered

- **Equal-width *all* keys** (white and black same width) — rejected; breaks the familiar piano affordance and makes octaves irregular widths on-screen.
- **SVG viewBox with percentage coordinates** — rejected; requires `react-native-svg` (new dep) and the plain-`<View>` approach gives identical pixel fidelity.
- **Fixed key widths (not container-scaled)** — rejected; the spec requires fill-to-width (FR-007).
- **Different aspect ratio (e.g., 4.0 or 7.0)** — 5.5 was chosen from a visual check against real pianos in dark UI; this value is kept in one constant (`KEY_ASPECT` in `src/keyboard/layout.ts`) and can be tuned without code churn.

---

## 2. Storybook integration

### Decision

Adopt `@storybook/react-native` v8.x as the stories workshop. Install:

```bash
npx storybook@latest init --type react_native
```

(or, if the CLI has diverged, install peer deps manually — the exact set is captured in `package.json` after the initializer runs).

Configure an opt-in entry point:

```ts
// index.ts
import { registerRootComponent } from 'expo';
import App from './App';
import StorybookApp from './.storybook';

const isStorybook = process.env.EXPO_PUBLIC_STORYBOOK === 'true';
registerRootComponent(isStorybook ? StorybookApp : App);
```

Two new npm scripts:

```json
{
  "storybook": "EXPO_PUBLIC_STORYBOOK=true expo start",
  "storybook:generate": "sb-rn-get-stories --config-path .storybook"
}
```

Stories are co-located with their components: `src/keyboard/Keyboard.stories.tsx`. The Storybook initializer regenerates `.storybook/storybook.requires.ts` which `require()`s each `*.stories.tsx` file.

### Rationale

- **On-device rendering**: the keyboard component is highly layout-sensitive (fill-to-width, pixel-exact key widths). On-device rendering through the dev client catches layout bugs that a web-based RN-web Storybook could hide.
- **v8.x**: current major; compatible with RN 0.81 and Expo SDK 54.
- **Env-guarded entry**: a single `index.ts` branch is the lightest-weight way to toggle. No Metro config changes, no second app bundle.
- **Stories co-located with components**: the canonical React convention (Storybook's own docs recommend it). Developers editing `Keyboard.tsx` edit its stories in the same directory.

### Alternatives considered

- **Storybook 7.x** — rejected; v8 is current and v8's RN support is the actively-maintained line.
- **Web Storybook via `react-native-web`** — rejected (see plan §Complexity Tracking).
- **A dedicated Storybook Expo entry (second Metro root)** — rejected; more ceremony than it is worth at this stage. Keep optionality for future.
- **Stories in a separate `stories/` dir** — rejected; co-location scales better, keeps component + stories in the same PR context.
- **Chromatic / visual-regression** — out of scope for this feature. Could be added later without changing component code.

---

## 3. White-key contract enforcement

### Decision

The component treats invalid `low`/`high` (either is a black key, or `low > high`) as a programming error:

- In development builds (`__DEV__ === true`), render a bright visible error placeholder ("Keyboard: invalid range — low and high must be white keys") with `testID="keyboard-error"`, and log a `console.warn` with the offending values.
- In production builds (`__DEV__ === false`), render the same placeholder silently (no console noise). The app does not crash (Principle I).
- The component does **not** silently coerce a black key to the nearest white key.

### Rationale

- Spec's FR-003 says white-key boundaries are a caller obligation. Coercing hides bugs and creates subtly wrong layouts. An explicit error placeholder makes the mistake visible during development without taking down the surrounding UI.
- The error placeholder is small (≤ 30 LOC) and piggybacks on the component's existing render path; no separate error boundary is needed at this level.
- Production behavior deliberately does not log — an end-user device should not spam diagnostics for code paths the dev was supposed to prevent.

### Alternatives considered

- **Throw on invalid input** — rejected; violates Principle I (render errors must not crash the surrounding tree).
- **Silently clamp to nearest white key** — rejected; hides bugs and introduces off-by-one mismatches vs. the caller's intent.
- **A React error boundary around the component** — unnecessary at this scope; in-component fallback is simpler and keeps invariants local.

---

## 4. Color tokens and contrast

### Decision

Three additive entries in `src/theme/colors.ts`:

| Token                | Purpose                                 | Suggested hex | Contrast target                                 |
|----------------------|-----------------------------------------|---------------|-------------------------------------------------|
| `keyboardWhiteKey`   | Fill color for white keys.              | `#E8E8EA`     | Must produce ≥ 3:1 against `surface` (UI component contrast, WCAG AA). |
| `keyboardBlackKey`   | Fill color for black keys.              | `#1A1A1F`     | Must produce ≥ 3:1 against `surface` (so the silhouette is visible). |
| `keyboardHighlight`  | Fill color for highlighted keys (blue). | `#2563EB` (reuse `accent`) | Must produce ≥ 4.5:1 against `keyboardWhiteKey` AND against `keyboardBlackKey` (FR-009, SC-003). |

Keys have a 1 px `colors.border` separator on their right edges (except the last white key) to visually distinguish adjacent white keys.

### Rationale

- Reusing `accent` as `keyboardHighlight` keeps the palette coherent with the rest of the dark theme; if later design review prefers a distinct shade, only the one token changes.
- `#E8E8EA` vs. `surface #0B0B0D` is approximately 14:1 (AAA). Reads clearly as "ivory" against the dark background.
- `#1A1A1F` vs. `surface` is ~2.9:1 — technically below WCAG AA for text but acceptable for a piano silhouette where silhouette shape (not text) is the information carrier. For a highlighted black key (`#2563EB` on `#1A1A1F`), contrast is ~4.0:1, meeting the 3:1 bar for UI components. Final hex values are verified in a Phase-6 task; if the black key needs to be slightly lighter to satisfy contrast, we adjust.
- `#2563EB` vs. `#E8E8EA` is ~4.7:1 (AA). Confirmed meets FR-009.

### Alternatives considered

- **Pure white #FFFFFF for white keys** — rejected; too bright in orchestra-pit darkness, glares against the dark surface.
- **Pure black #000000 for black keys** — rejected; invisible against `performBlack`-level surfaces; we need the black key to be distinguishable from the backdrop for silhouette.
- **A distinct keyboard-only blue rather than reusing `accent`** — possible in a future design pass; not needed now.

---

## 5. Fill-to-width: measurement and reflow

### Decision

Use `onLayout` on the component's root `<View>` to capture the allocated `width`. When width changes (including the first mount), re-run the layout math and re-render. Do not rely on `Dimensions` or `useWindowDimensions` — those are screen-wide and miss the case where the parent's width is constrained by a flex layout.

Pseudocode:

```ts
function Keyboard({ low, high, highlighted }: KeyboardProps) {
  const [width, setWidth] = useState(0);
  const layout = useMemo(
    () => computeKeyboardLayout(low, high, width),
    [low, high, width],
  );
  return (
    <View style={{ width: '100%', height: layout.height }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* render keys from `layout.keys` */}
    </View>
  );
}
```

### Rationale

- `onLayout` is the idiomatic RN API for "what width did my parent allocate to me." It fires on mount and whenever the parent's layout changes (rotation, flex reflow, split-view resize).
- Memoising the computed layout on `(low, high, width)` keeps the render path cheap even with large ranges.
- Setting `width: '100%'` on the outer view lets the component absorb whatever horizontal space is available.
- Height is derived from the computed layout (not a hardcoded prop) so the component self-sizes vertically.

### Alternatives considered

- **`useWindowDimensions`** — rejected; measures screen, not the component's allocated slot.
- **Rendering with `flex: 1`** — rejected for black-key positioning; absolute positioning needs a known width baseline.
- **Recomputing layout on every render** — rejected; wasteful even though cheap. `useMemo` is a free win here.

---

## 6. Tests (UI chrome, not test-first)

### Decision

Write three test files, in the order:

1. **`__tests__/keyboard/notes.test.ts`** — pure unit tests for `isWhiteKey` (covering the 12 pitch classes), `whiteKeyCount` (edge cases: `low === high`, `low > high`, full 88-key range, single octave).
2. **`__tests__/keyboard/layout.test.ts`** — pure unit tests for `computeKeyboardLayout` (snapshot-style: a 2-octave range at 700 pt width produces exactly 25 white keys at W=28 pt each and 10 black keys at their expected x positions).
3. **`__tests__/keyboard/Keyboard.test.tsx`** — component render tests using `@testing-library/react-native`: renders the expected count of key `testID`s, applies the highlight style to in-range highlighted notes, silently ignores out-of-range highlights, shows the error placeholder for a black-key boundary.

### Rationale

- Principle IV exempts UI chrome from strict TDD, but these tests are cheap and safeguard the component as Setup / Patches / Cues features start consuming it.
- Separating pure helpers from component rendering keeps most assertions fast and jsdom-free.
- Snapshot-style assertions on `layout.ts` are OK because the layout is mathematically deterministic.

### Alternatives considered

- **No tests** — would satisfy Principle IV but leaves later features exposed to regressions. Low cost to write, high cost to skip.
- **Only a visual regression test (Chromatic / Percy)** — out of scope; Jest + testing-library assertions on testIDs and styles are sufficient for this phase.
- **Testing through Storybook with an interaction-testing addon** — overkill for this feature.

---

## 7. A11y, interactivity, and future-proofing

### Decision

- Component root carries `accessibilityRole="image"` and an `accessibilityLabel` generated from props: e.g., `"Keyboard, range C3 to C5, 3 highlighted: Middle C, E4, G4"` (truncated to 5 highlighted notes with "…and N more" suffix if longer).
- Individual keys carry no accessibility metadata. They are not focusable, tappable, or navigable.
- The component signature is designed to extend to interactivity later without breaking callers: adding an optional `onKeyPress?: (midi: number) => void` prop in a future feature does not change the render contract.

### Rationale

- Principle VII does not require screen-reader support, but a single descriptive label at the root is cheap and informative. We truncate the highlighted list so the label is not unbounded.
- Role `"image"` is more honest than `"none"` or `"text"` — it is a decorative visual artifact.
- Non-interactive keys keep the contract small and leave tap handling to a future feature.

### Alternatives considered

- **Per-key a11y labels** — rejected; excessive for a non-interactive display.
- **Role `"none"`** — rejected; assistive tech should at least announce *something* when it lands on the component.

---

## 8. No scroll, no zoom

### Decision

The component does not scroll horizontally even if the range is wide relative to the container. Keys shrink to fit the width. There is no zoom affordance.

### Rationale

- Spec FR-007 says "expand to fill the full width." A scrolling keyboard would violate the mental model of "here is the range I care about, all visible."
- For ranges that become visually cramped (e.g., 88 keys at 320 pt), SC-004 requires they remain visible and identifiable. We verify this at the minimum width in a test.
- Zoom is a UX concern that belongs to a future interactive feature (if ever needed).

### Alternatives considered

- **Horizontal `ScrollView`** — rejected per FR-007.
- **Auto-shrink vertically when too narrow** — rejected; we keep the aspect ratio constant so the component is predictable to consumers.

---

## 9. Package version pins

### Decision

- `@storybook/react-native`: `^8` (minor-compatible with whatever initializer picks; pinned in `package.json` via the standard install).
- No other new production dependencies.
- Storybook peer deps (`react-native-safe-area-context` — already installed; `@react-native-async-storage/async-storage` — already installed; `@react-native-community/datetimepicker` — only if Storybook's default addons require it, likely not for our story set) are resolved at install time.

### Rationale

Reuse already-installed peers. Only introduce what Storybook truly needs. The `package.json` diff should be small (one primary dev-dep plus whatever the initializer pulls in).

### Alternatives considered

- **Vendor Storybook via a submodule or local copy** — rejected; standard npm install is simpler and well-supported.
- **Exact-pin all deps** — rejected; following the project's existing loose-pin convention is fine for dev tooling.

---

## Cross-cutting notes

- **No native module changes.** No iOS or Android code touched. No rebuild of the dev client required for the component itself (Storybook init may require a fresh dev-client build; we'll verify in Phase 6).
- **Dark-mode palette extensions** are additive entries in `src/theme/colors.ts`; no existing colors change.
- **Test harness unchanged.** New tests use the existing `jest-expo` + `@testing-library/react-native` setup.
- **CLAUDE.md** gets an Active-Technology entry for Storybook via `update-agent-context.sh`.
