# Research: Edit Mode View Switcher

**Feature**: `003-edit-view-nav`
**Date**: 2026-04-21

Each section below captures one design decision, the reasoning, and the alternatives considered. The `Technical Context` in `plan.md` has no NEEDS CLARIFICATION markers — these entries lock in the choices the plan depends on.

---

## 1. Layout mode detection (tablet vs phone)

### Decision

Width-based detection via `useWindowDimensions()` from `react-native`, with a single breakpoint at **600 logical pixels**. A new hook `useLayoutMode()` returns `'phone'` for `width < 600` and `'tablet'` for `width >= 600`. Breakpoint is exported from `src/layout/breakpoints.ts` as `TABLET_MIN_WIDTH = 600` so it is visible to tests and future code.

### Rationale

- The spec's Edge Case requires the iPad split-view 1/3 configuration (~320 pt wide on a 12.9" iPad) to use the phone layout, even though the hardware is a tablet. Only a width-based test catches this.
- `useWindowDimensions()` is a React-Native core hook that fires on rotation, iPad split-view resize, Android multi-window resize, and foldable unfold/fold. No extra dependency or listener setup required.
- 600 dp is the Android Material Design convention for the "compact → medium" breakpoint, and on iOS it lands between all supported iPhones (portrait) and all iPad configurations at ≥ 1/2 split or wider.
- Verified against common device widths:
  - iPhone 15 Pro Max portrait: 430 pt → phone ✓
  - iPhone 15 Pro Max landscape: 932 pt → tablet (acceptable — landscape phones get the tablet segmented control; this is a *feature*, not a bug, because the header then has more room)
  - iPhone SE portrait: 375 pt → phone ✓
  - iPad Mini portrait: 744 pt → tablet ✓
  - iPad Pro 12.9" 1/3 split: 320 pt → phone ✓
  - iPad Pro 12.9" 1/2 split: 512 pt → phone ✓
  - iPad Pro 12.9" 2/3 split: ~704 pt → tablet ✓
  - Galaxy Fold folded: 280 dp → phone ✓; unfolded: 673 dp → tablet ✓

Two verified device widths land on the "acceptable but not obvious" side: iPhone 15 Pro Max landscape gets the tablet-style segmented control. This is intentional — at 932 pt wide, the segmented control fits comfortably, and a phone user in landscape gets the richer affordance automatically. If this becomes a UX problem (reported by users of large phones in landscape), the breakpoint can be adjusted without changing any other file.

### Alternatives considered

- **`Platform.isPad` / `DeviceInfo.isTablet`** — rejected. Misclassifies split-view iPads and folded foldables. Device class is the wrong question; the question is "does this window have room?"
- **Multiple breakpoints (e.g., 600 and 900)** — rejected. YAGNI. The spec requires exactly two layouts. If a third is needed later, adding a second threshold and a `'wide'` return value is additive.
- **Listening for `Dimensions.addEventListener('change', …)` manually** — rejected. `useWindowDimensions` does this for us and keeps the effect inside React's render cycle.

---

## 2. Segmented control implementation (tablet variant)

### Decision

Custom segmented control built from three `Pressable`s in a horizontal flex row. The container has rounded corners and a subtle background to group the segments visually; the selected segment has a distinct fill and higher-contrast label; each segment has `accessibilityRole="tab"` and `accessibilityState={{ selected }}`.

### Rationale

- React Native has no cross-platform segmented control in core. The only well-known library, `@react-native-segmented-control/segmented-control`, is a wrapper over iOS's `UISegmentedControl` and falls back to a JS implementation on Android — we'd end up maintaining both behaviors and still need custom dark-mode theming.
- A custom component gives direct control over dark-mode colors (reusing `src/theme/colors.ts` tokens), the pressed state, the focus ring required by Principle VII, and the exact hit-target sizes required by Principle VI.
- The `tab` accessibility role is the WAI-ARIA-idiomatic role for a segmented control whose segments select among mutually exclusive views — matches what Apple's own `UISegmentedControl` exposes as `UISegmentedControlTraitSegment`.

### Structural notes

- The control is a single `View` with `flexDirection: 'row'`. Each segment is a `Pressable` with `flex: 1` inside that row. This keeps total control width controllable by the parent (the header).
- Tap → `setEditView(segmentKey)`. Re-tapping the already-selected segment is a no-op (not an error; dispatches no state change).
- Focus order: first segment gains focus first; arrow keys move focus within the group; `Tab` moves focus out. (React Native does not natively wire arrow-key navigation; we handle it via `onKeyPress` in Web parity and rely on the system default on iOS/Android where external keyboards are used with a hardware cursor.)

### Alternatives considered

- **`@react-native-segmented-control/segmented-control`** — rejected; iOS-only core with a fallback we can't style to match the app.
- **A single `Picker` or `RNPickerSelect`** — rejected; not a segmented-control affordance and does not meet the "visible at all times" requirement of the tablet design.
- **A `ToggleButtonGroup`-style radio list** — rejected; less compact and loses the grouped-pill aesthetic.

---

## 3. Dropdown menu implementation (phone variant)

### Decision

Custom dropdown built on React Native's `Modal`:
- `<Modal transparent animationType="fade" visible={open} onRequestClose={close} supportedOrientations={…all four…}>`.
- A full-size `Pressable` backdrop dismisses the menu when tapped outside.
- The menu itself is a `View` positioned below the anchor button using coordinates captured via `anchorRef.measureInWindow()` at open-time. The position is computed once per open and does not re-track if the window resizes while the menu is open — closing and reopening suffices, which matches the edge case clarification.
- Each menu item is a `Pressable` with `accessibilityRole="menuitem"` and `accessibilityState={{ selected }}`, and a leading checkmark (from `@expo/vector-icons`) for the currently selected Edit sub-view.

### Rationale

- `Modal` is the only cross-platform RN primitive that reliably renders above sibling views on both iOS and Android, including above the header's z-index and the parent's clipping. Positioning via `measureInWindow` is stable enough for a menu anchored to a fixed header control.
- A full-surface `Pressable` backdrop is the idiomatic pattern for tap-outside-to-dismiss on React Native and works identically on iOS and Android. Android's system back gesture is routed through the `Modal`'s `onRequestClose`.
- Focus management on open: focus moves to the first menu item; on close, focus returns to the anchor (`View` button). This matches the constitution's Principle VII requirement and the spec's acceptance criteria.

### Alternatives considered

- **`react-native-popup-menu`** — rejected. Adds a dependency for a small surface; requires wiring `MenuProvider` high in the tree; its built-in styles fight the dark theme.
- **A `Picker`** — rejected. Picker UX is modal wheel/spinner on iOS and dropdown on Android; inconsistent and not the affordance the spec specifies ("dropdown").
- **A bottom sheet** — rejected. The spec describes a dropdown attached to the header control, not a sheet rising from the bottom. A sheet would also cover the MIDI activity readout during selection, which is user-hostile.

---

## 4. Where `editView` state lives

### Decision

A new context `EditViewContext` exposed at the Shell level, as a sibling to `ModeProvider`. Its shape:

```ts
interface EditViewContextValue {
  editView: EditView;          // 'setup' | 'patches' | 'cues'
  setEditView: (next: EditView) => void;
}
```

The provider is session-scoped — no `AsyncStorage` access, no `useEffect` syncing. Initial value is `'setup'` (FR-008). `useMemo` on the context value to avoid re-renders in consumers when `setEditView` reference is stable.

### Rationale

- `Shell.tsx` conditionally renders `<EditMode />` or `<PerformMode />`. When the user switches to Perform mode, `EditMode` **unmounts**; any `useState` inside it would be lost. FR-009 and US3 require preservation.
- Placing the provider at the Shell level (above the conditional rendering) keeps the state alive across Edit ↔ Perform switches within a session, and drops it on cold launch — exactly the session semantics the spec calls for.
- Mirrors the existing `ModeContext` pattern in `src/mode/`, so the project continues to look self-consistent.

### Alternatives considered

- **`useState` in `EditMode`** — rejected; fails FR-009 because `EditMode` unmounts.
- **Put selection inside `ModeContext`** — rejected; muddles two concerns. Mode is "edit vs perform"; sub-view is "which edit surface". They change independently and a future feature may want to subscribe to just one.
- **Global state library (Zustand, Redux)** — rejected; overkill for a single session-scoped enum.
- **AsyncStorage persistence** — rejected per spec's Assumptions: cold launch resets to `Setup`. Persisting is out of scope for this feature.

---

## 5. Accessibility roles and keyboard semantics

### Decision

- **Segmented control** (tablet):
  - Container: `accessibilityRole="tablist"` (React Native supports this on iOS/Android as a passthrough label for VoiceOver/TalkBack; it's a no-op on platforms that don't).
  - Each segment: `accessibilityRole="tab"`, `accessibilityLabel` = segment label, `accessibilityState={{ selected: isActive }}`. The *selected* state is conveyed beyond color by the filled background and by the a11y-state marker.
  - Keyboard: segments are reachable in tab order. We do not wire arrow-key navigation within the control in this feature — `Tab` cycles across segments and `Enter`/`Space` activates. Arrow-key support can be added later without any contract change.
- **Dropdown** (phone):
  - Anchor button: `accessibilityRole="button"`, `accessibilityLabel="View"`, `accessibilityHint="Opens view menu"` (hint is Principle VII-safe — descriptive, not required).
  - Menu container: `accessibilityViewIsModal={true}` and `accessibilityRole="menu"` to isolate focus while open.
  - Each item: `accessibilityRole="menuitem"`, `accessibilityState={{ selected: isActive }}`, plus a leading checkmark glyph for the currently-selected Edit sub-view.
  - `Escape` key (external keyboard) and Android back gesture close the menu via `Modal.onRequestClose`. On close, focus returns to the anchor.

### Rationale

- Principle VII says screen-reader support is NOT required, so we don't gate this feature on perfect VoiceOver/TalkBack labels — but the roles and states above are cheap to set and improve the experience for the assistive users who do exist.
- Keyboard reachability and visible focus rings ARE required by Principle VII. The existing `colors.focusRing` token already satisfies the contrast requirement against the dark header; we reuse it.
- The `selected` state on segments and menu items is conveyed by position, background fill, and assistive marker — never by color alone. This satisfies Principle VII's color-blind-safety rule.

### Alternatives considered

- **Arrow-key navigation within the segmented control** — deferred. Nice-to-have, not required by the spec, and adds handler wiring we don't need for Stage 1. Filed for a follow-up feature.
- **Voice-Over "group" role** — rejected; `tablist` is more specific and the correct WAI-ARIA idiom.
- **Custom focus trap using `ref` + `isFocused`** — rejected; `Modal`'s built-in behavior plus `accessibilityViewIsModal` is sufficient for our user base.

---

## 6. Interaction with `EditMode` and existing header content

### Decision

`EditMode.tsx` is restructured so the header and body are both parameterized by the active variant:

- Header (tablet variant): `[Perform button]  [Segmented: Setup|Patches|Cues]  [MidiActivityDisplay]  [Prefs gear]`
- Header (phone variant): `[View dropdown]  [MidiActivityDisplay]  [Prefs gear]`
- Body: `<EditViewBody />`, which renders `<SetupView />`, `<PatchesView />`, or `<CuesView />` based on `editView` from context.

Each variant is a single component (`EditViewSegmented` / `EditViewDropdown`) that knows nothing about its sibling controls; the parent (a small `EditViewHeaderControl` component inside `EditMode`) switches on `useLayoutMode()` to pick which one to render, and also decides whether the standalone `Perform` button is rendered (tablet: yes; phone: no, because `Perform` appears inside the dropdown).

### Rationale

- The two variants have different header slots: tablet has four items (Perform, Segmented, Activity, Prefs); phone has three (View, Activity, Prefs). Keeping them in separate components avoids a single monster header with conditional slots.
- `MidiActivityDisplay` and `PreferencesMenu` (gear) stay untouched. Their current layout role in `EditMode` is preserved (activity centered, gear on the far right).
- `EditViewBody` is a thin consumer of `EditViewContext`; swapping it to a keyed approach later (if we wanted view-specific animations) is additive.

### Alternatives considered

- **A single `Header` component taking slot props** — rejected as overengineered for two variants. A switch in `EditViewHeaderControl` is two lines and clearer.
- **Merge `EditViewBody` into `EditMode`** — possible, but extracting it is a one-line component that makes the test for body swapping trivial.

---

## 7. Placeholder content for Setup, Patches, Cues

### Decision

Each of `SetupView`, `PatchesView`, `CuesView` is a single component rendering a centered label (the view's display name) on the existing `colors.surface` background. Each exposes a testID matching its key: `view-setup`, `view-patches`, `view-cues`.

### Rationale

- FR-013 requires only that each view be identifiable as itself — the real content is out of scope.
- A labeled placeholder prevents silent regressions (if the body fails to swap, the label would be stale and tests would catch it).
- Independent components are a ready insertion point for the follow-up features that will fill them in.

### Alternatives considered

- **A single placeholder component parameterized by label** — rejected; each view will eventually be its own file with its own logic, so starting three separate files is correct.
- **Empty `View`s with only testIDs** — rejected; harder to eyeball during manual QA, and removing the label later is a one-line change.

---

## Cross-cutting notes

- **No new dependencies.** The feature uses only what's already in `package.json` as of feature 002.
- **No native module changes.** No iOS/Android code modified; no rebuild required to test.
- **Dark-mode palette extensions** are additive entries in `src/theme/colors.ts`; no existing colors change.
- **Test harness unchanged.** Width manipulation in tests uses `jest.mock('react-native/Libraries/Utilities/useWindowDimensions', ...)` or the existing `Dimensions` mock pattern; both are already in use elsewhere.
