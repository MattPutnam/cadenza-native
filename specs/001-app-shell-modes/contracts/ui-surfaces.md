# UI Contract: Edit and Perform Surfaces

**Feature**: `001-app-shell-modes`
**Date**: 2026-04-19

This project is a mobile app, so the "contract" here is the UI surface contract: the public-observable properties of each surface that tests and reviewers can assert against without caring about the implementation.

Each surface's contract is expressed as:

- **Landmarks**: elements that MUST be present, identified by accessibility role + label.
- **Controls**: interactive elements, identified by role + label, with the effect of activation.
- **Visual constraints**: properties that MUST hold for the design to be considered correct.
- **Absences**: elements that MUST NOT be present.

These are stable selectors that `@testing-library/react-native`'s `getByRole` / `getByLabelText` queries can pin against, and that manual QA can check from the screen.

---

## Edit surface

Active when `mode === 'edit'`.

### Landmarks

| Role     | Accessibility label | Notes                                                |
| -------- | ------------------- | ---------------------------------------------------- |
| `header` | *not required*      | A bar spanning the full width at the top of the screen. |

### Controls

| Role     | Accessibility label | Visible label  | Activation effect                 |
| -------- | ------------------- | -------------- | --------------------------------- |
| `button` | `"Perform"`         | `"Perform"`    | Transitions app to `mode === 'perform'`. |

### Visual constraints

- The header bar spans the full horizontal width of the viewport.
- The header bar is anchored at the top of the viewport.
- The "Perform" button sits on the left side of the header bar.
- All rendered colors come from `src/theme/colors.ts` dark-theme tokens; no raw hex values in the component.
- WCAG AA contrast holds for the button label against its background.

### Absences

- No hover-only affordances (no tooltip-on-hover, no hover-styled-only info).
- No multi-touch-required gestures for the "Perform" button or anything else on this surface.

### Keyboard behavior

- The "Perform" button MUST be reachable by Tab from the initial focus.
- When focused, the button MUST display a visible focus ring using `theme.colors.focusRing`.
- Pressing Enter or Space on the focused button activates it (native `Pressable` behavior on web; iOS / Android full keyboard access also honors this).

---

## Perform surface

Active when `mode === 'perform'`.

### Landmarks

None. The surface is deliberately chrome-free.

### Controls

| Role     | Accessibility label | Visible element              | Activation effect                 |
| -------- | ------------------- | ---------------------------- | --------------------------------- |
| `button` | `"Exit Perform mode"` | Close (×) icon glyph       | Transitions app to `mode === 'edit'`. |

### Visual constraints

- The background fills the entire viewport with `theme.colors.performBlack` (pure `#000000`).
- The close control is positioned in the top-left corner of the current orientation.
- The close control's visible glyph fits within a touch target of at least 44pt (iOS) / 48dp (Android).
- The close control MUST remain visible against the black background with AA contrast.

### Absences

- No header bar.
- No status bar chrome visible within the rendered content (the OS status bar may remain; Expo's StatusBar is set to `style="light"` for consistency, not visibility).
- No visible text or icons other than the close control.
- No loading spinners, animations, progress indicators, or any other UI element.

### Keyboard behavior

- The close control MUST be reachable by Tab from the initial focus.
- When focused, it MUST display a visible focus ring using `theme.colors.focusRing` that remains readable against the black background.
- Pressing Enter or Space on the focused control activates it.

---

## Shell-level contract

The shell (`src/app/Shell.tsx`) is not a user-visible surface but has a contract of its own:

- Exactly one of `<EditMode />` / `<PerformMode />` is mounted at any time.
- The mounted surface corresponds to the current `mode` value from `useMode()`.
- Shell MUST NOT retain any mode-switch logic of its own — it is a pure selector on `mode`.
- Shell MUST render inside a `<ModeProvider>`; rendering without the provider is a developer error (caught in tests).

## Tests that enforce this contract

| Test file                                  | What it pins                                                    |
| ------------------------------------------ | --------------------------------------------------------------- |
| `__tests__/app/Shell.test.tsx`             | Shell selects the correct surface for each `mode` value.        |
| `__tests__/app/EditMode.test.tsx`          | Edit landmarks + control presence, activation calls `setMode`. |
| `__tests__/app/PerformMode.test.tsx`       | Perform absences + control presence, activation calls `setMode`, black background. |
| `__tests__/mode/ModeContext.test.tsx`      | Initial value, transition correctness, provider guard.         |
