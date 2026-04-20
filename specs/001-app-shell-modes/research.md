# Phase 0 Research: App Shell — Edit and Perform Modes

**Feature**: `001-app-shell-modes`
**Date**: 2026-04-19

The plan introduced no `NEEDS CLARIFICATION` markers. The purpose of this research doc is to lock in each technology/approach choice with an explicit Decision / Rationale / Alternatives considered trail, so downstream tasks and reviewers can see why each piece was picked.

## 1. Mode state management

**Decision**: React Context (`ModeContext`) holding a tuple-like `{ mode, setMode }` value. No external state library.

**Rationale**:

- The state is a single enumerated value (`'edit' | 'perform'`) with one writer (the shell's two controls). A Context provider at the App root is the minimum viable primitive.
- Adding Zustand / Redux / MobX for two states would be gratuitous complexity and would mint a pattern that later features could mistake for "the official store" before the domain is understood.
- Context re-renders are not a performance concern here; the consumer tree is shallow (Shell and at most one of EditMode / PerformMode at a time), and renders per transition are on the order of a handful of components.

**Alternatives considered**:

- `useState` at `App.tsx` and prop-drilling — rejected because even at this scope we pass through `Shell` and down to both surfaces; a Context is barely more code and avoids the drill.
- Zustand — rejected as premature for a 2-value enum.
- Redux — rejected; wildly disproportionate.

## 2. Testing stack

**Decision**: `jest-expo` (the preset that ships with Expo SDK 54) + `@testing-library/react-native` for component behavior. No detox / maestro / other E2E in this feature.

**Rationale**:

- `jest-expo` is the canonical RN testing preset for managed-workflow Expo projects and is already on-disk via `expo` as a transitive. It handles the RN transformer, the `__mocks__` layout, and the test-environment setup for React Native.
- `@testing-library/react-native` gives queries-by-role / -by-label that align with the accessibility props we're already required to set by Principle VII, so tests validate a11y wiring for free.
- Principle IV doesn't mandate tests for non-stage-affecting logic, but these tests cost almost nothing and pin down the acceptance scenarios from `spec.md`. They become the first reference example for how to test future shell-level state.

**Alternatives considered**:

- Detox / Maestro — excellent for on-device E2E, but premature for a feature with two surfaces and zero native integration. Defer to a later feature that actually needs device automation.
- Skipping tests — rejected; even for non-stage-affecting logic, pinning the shell's mode invariants prevents silly regressions and exercises the `accessibilityLabel`/`accessibilityRole` wiring Principle VII requires.

## 3. "X" close icon source

**Decision**: `@expo/vector-icons` `Ionicons` `close` glyph (or equivalent), rendered at a size generous enough to absorb a ≥44pt hit area including padding.

**Rationale**:

- `@expo/vector-icons` ships with every Expo app; no new dependency.
- Ionicons `close` is a simple, universally recognized X glyph that renders crisply at any size via the vector font.
- Wrapping the icon in a `Pressable` with explicit `hitSlop` / `padding` lets us decouple visual size from touch-target size, which Principle VI requires.

**Alternatives considered**:

- Rendering a literal Unicode `✕` / `×` in a `<Text>` element — rejected because text glyphs vary across platforms/fonts and won't always render as a clean close mark.
- Hand-rolled SVG via `react-native-svg` — works but adds a dep for one glyph; deferred until we actually need custom iconography.
- Material/FontAwesome via `@expo/vector-icons` — equally available; Ionicons is just a convention pick.

## 4. Dark-theme color tokens

**Decision**: A single `src/theme/colors.ts` module exporting a small set of semantic tokens (e.g., `surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `focusRing`, `performBlack`). WCAG AA contrast verified against `textPrimary` / `surface`, `textPrimary` / `surfaceElevated`, and `focusRing` / `surface`.

**Rationale**:

- Centralizes the dark-mode palette so every future surface reads from one source.
- Names are semantic, not color-specific (`surface`, `textPrimary`) so the palette can be tuned without renaming.
- `performBlack` is distinct from `surface` — Perform mode's black is literally `#000000`, while the Edit-mode surface may be a near-black (e.g., `#0B0B0D`) that reads more comfortably in an orchestra pit but doesn't strain the eyes.
- No runtime theming library (tamagui, unistyles, etc.) for a five-token palette.

**Alternatives considered**:

- Inlining hex codes in each component — rejected; impossible to audit contrast and trivially inconsistent.
- `StyleSheet` per-component color constants — rejected for the same reason.
- A full design-token system (tamagui, unistyles, restyle) — overkill for five tokens; revisit when we have a real palette.

## 5. Keyboard accessibility on React Native

**Decision**: Rely on React Native's built-in `accessible`, `accessibilityRole="button"`, `accessibilityLabel`, and `focusable` props on `Pressable`. Render a visible focus ring via a conditional style driven by `onFocus` / `onBlur` (or, on web, `:focus-visible` via `react-native-web`'s default handling).

**Rationale**:

- React Native 0.76+ and `react-native-web` both honor these props; the platform supplies default focus rings on iOS (hardware keyboard), Android TV / Android with keyboard, and on the web.
- An explicit `focusRing` token in the palette (see §4) lets us override the default focus treatment for dark mode where the system default may be invisible or low-contrast.
- Keeps the implementation small and framework-native; no extra packages.

**Alternatives considered**:

- `react-native-keyboard-aware-*` family — addresses a different problem (text-input keyboard avoidance), not hardware-keyboard focus management.
- Implementing a custom focus manager — rejected as premature; the platforms handle focus cycles correctly for a handful of controls.

## 6. Persistence of Mode across app lifecycle

**Decision**: In-memory only, via the `ModeContext`'s default `'edit'` initial value. No `AsyncStorage`, no `expo-secure-store`, no platform-specific persistence.

**Rationale**:

- FR-002 explicitly requires cold launch → Edit.
- FR-010 requires preservation across brief backgrounding within a session. React state survives foreground/background transitions in React Native by default (the component tree isn't unmounted), so no additional work is needed.
- This decision will be revisited when show/cue state is introduced — at that point Perform mode may need to be restored automatically, gated on the presence of an active show.

**Alternatives considered**:

- Persisting mode to `AsyncStorage` — rejected because it contradicts FR-002.
- Persisting mode conditionally on "active show" — deferred; there's no show state yet to condition on.

## Summary

All technology choices are locked. No `NEEDS CLARIFICATION` remains. The implementation path is: add `ModeContext` + `useMode` + `Shell` + `EditMode` + `PerformMode` + `theme/colors`, wire `App.tsx` to provide the context and render the shell, set up `jest-expo` + `@testing-library/react-native`, and write behavioral tests covering the acceptance scenarios.
