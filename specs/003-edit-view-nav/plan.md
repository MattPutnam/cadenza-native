# Implementation Plan: Edit Mode View Switcher

**Branch**: `003-edit-view-nav` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-edit-view-nav/spec.md`

## Summary

Redesign the Edit-mode header so the user can navigate among three new Edit sub-views — **Setup**, **Patches**, **Cues** — without leaving Edit mode. On a tablet-class layout, a three-segment switcher sits to the right of the existing `Perform` button. On a phone-class layout, a single `View` control replaces the `Perform` button; tapping it opens a dropdown whose entries are Setup, Patches, Cues, Perform. The current Edit sub-view survives Edit → Perform → Edit round-trips within a session, and resets to `Setup` on cold launch. The three sub-views render as labeled placeholders in this feature; their real content is delivered by follow-up features.

Technical approach: add a session-scoped **`EditViewContext`** provider at the Shell level (sibling to `ModeProvider`), so sub-view selection survives `EditMode` unmounting during mode switches. A width-based **`useLayoutMode()`** hook (`phone` under 600 logical px, `tablet` at/above) drives the header variant — the hook re-fires on rotation and iPad split-view resize. The tablet variant is a custom styled **segmented control** (three `Pressable`s using the `tab` accessibility role). The phone variant is a custom **dropdown menu** built on React Native `Modal` with a `Pressable` backdrop, anchored below the `View` button via `measureInWindow`. No third-party library is adopted; this is UI chrome over existing state.

No changes to MIDI, storage, or native code. `EditMode.tsx` is restructured but remains one file; the MIDI activity display and preferences gear stay in their current slots.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict). No new native code.
**Primary Dependencies**: React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `react-native-safe-area-context` and `@expo/vector-icons` (existing) are reused. **No new npm dependencies.**
**Storage**: None. The Edit sub-view selection is session-scoped in-memory state only (per spec FR/assumptions).
**Testing**: `jest-expo` + `@testing-library/react-native` (existing). New unit/integration test files: `EditViewContext.test.tsx`, `EditViewSegmented.test.tsx`, `EditViewDropdown.test.tsx`, `useLayoutMode.test.ts`, plus updates to `EditMode.test.tsx` and `Shell.test.tsx`.
**Target Platform**: iOS 17+ (iPhone + iPad, including split-view) and Android (phone + tablet). Web inherits the same layout logic (no-op for now; width-based decision still works).
**Project Type**: mobile-app (Expo Dev Client).
**Performance Goals**:
- Sub-view switch renders within one frame (≤ 16.7 ms at 60 Hz) — no async work, no loading indicator. Satisfied by render-only state change.
- Dropdown open/close animation ≤ 150 ms fade; does not block touch input on the rest of the header.
- `useLayoutMode()` re-evaluates synchronously with `useWindowDimensions`; no timers, no RAF.
**Constraints**:
- **Principle VI** — all new controls (each segment, the `View` button, each menu item) have ≥ 44 pt / 48 dp hit targets. No hover-only affordances. No multi-touch gestures. Dark theme only.
- **Principle VII** — every control is keyboard-reachable with a visible focus ring against the dark background; selected state is conveyed by position and fill, not color alone; label text meets WCAG AA against the segment background.
- **Principle I** — the feature is UI chrome and has no stage-affecting paths. A render-error in a placeholder view MUST NOT take down the rest of the Edit header; each sub-view is independently mountable.
- The tablet/phone cutover is width-based, not device-class-based, so that iPad split-view and foldables are handled correctly.
**Scale/Scope**: 3 new placeholder views, 2 header-variant components, 1 context + hook pair, 1 layout hook, ~6 test files. Expected delta ~500–800 LOC in TS/TSX. No changes to native modules or build config.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `constitution.md` v1.1.0.

### I. Reliability During Performance (NON-NEGOTIABLE) — **applicable, pass**

The feature is UI-only and has no stage-affecting paths, but render-error containment still matters: a broken placeholder view MUST NOT unmount the Edit header (which hosts the MIDI activity readout and the preferences gear). Each sub-view is a leaf component selected at render time; no shared state tie, no cascading failure. No storage I/O introduced, so graceful-degradation is trivially satisfied. The Edit sub-view selection is in-memory only — there is no persistence layer to fail.

### II. Real-Time MIDI Path Integrity — **applicable, trivially pass**

No MIDI code is touched. The MIDI activity readout continues to live in the Edit header, unaffected by this feature. Sub-view switching does not tear down or reinitialize `MidiInputContext`.

### III. Hardware-First Sound Architecture — **not applicable**

No audio code. Trivially compliant.

### IV. Test-First for Stage-Affecting Logic — **not applicable (UI chrome)**

Per Principle IV's second bullet ("Chrome, layout, and editor-only surfaces are exempt"), Edit-mode view navigation is chrome. Test-first is not required. We will still write behavioral tests for the context, the layout hook, and each header variant because the harness is already in place and regressions here would be user-visible.

### V. Spec-Driven, Feature-Branch Development — **applicable, pass**

Spec exists on `003-edit-view-nav`; this plan lives on the same branch; tasks and implementation will follow in the same branch until it merges to `main`.

### VI. Touch-First Performer UX — **applicable, pass**

- **Hit targets**: each segment ≥ 44 × 44 pt; the `View` button ≥ 44 × 44 pt; each dropdown menu item ≥ 44 pt tall. Padding provides finger-sized targets even where labels are short.
- **No hover states**: pressed-state styling only; no hover-contingent affordance.
- **No multi-touch**: single-tap everywhere.
- **Tablet-first**: the three-segment control is the reference design; the phone dropdown presents the same four destinations in a text list (Principle VI's "MAY present the same information more compactly" — phone sacrifices the segmented affordance, not the capability).
- **Dark mode only**: reuses existing `src/theme/colors.ts` tokens; any new tokens (selected-segment fill, menu surface, menu divider, menu item pressed) are added there.

### VII. Focused Accessibility — **applicable, pass**

- **Keyboard reachability**: segments and the `View` button are in the natural focus order of the header. When the dropdown opens, focus moves to the first menu item; `Escape` / back gesture closes and returns focus to the `View` button.
- **Focus visibility**: uses the existing `colors.focusRing` token, which is already verified against the dark surface.
- **State beyond color**: the selected segment uses a distinct background fill plus an `accessibilityState={{ selected: true }}` marker and an `accessibilityRole="tab"`. The dropdown's current selection is indicated by a leading checkmark glyph plus `accessibilityState={{ selected: true }}` — neither state is conveyed by color alone.
- **Contrast**: all new color pairs pass WCAG AA at the selected/unselected segment level and at the menu-item / menu-background level; verified during Phase 1 against `colors.ts`.

**Gate result (pre-Phase 0)**: PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/003-edit-view-nav/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/                   # Phase 1 output
│   └── ui-surfaces.md
├── checklists/
│   └── requirements.md          # Created by /speckit.specify
└── tasks.md                     # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── Shell.tsx                         # UPDATE — wrap <EditMode/>/<PerformMode/> in <EditViewProvider>
│   ├── EditMode.tsx                      # UPDATE — replace hard-coded Perform button with <EditViewHeaderControl/>;
│   │                                      #         replace empty body with <EditViewBody/>
│   ├── EditViewHeaderControl.tsx         # NEW — picks Segmented vs Dropdown from useLayoutMode()
│   ├── EditViewSegmented.tsx             # NEW — tablet 3-button toggle (Perform button rendered alongside, not inside)
│   ├── EditViewDropdown.tsx              # NEW — phone "View" button + Modal-based menu
│   ├── EditViewBody.tsx                  # NEW — renders one of SetupView/PatchesView/CuesView from context
│   ├── SetupView.tsx                     # NEW — placeholder (centered label, testID "view-setup")
│   ├── PatchesView.tsx                   # NEW — placeholder (testID "view-patches")
│   ├── CuesView.tsx                      # NEW — placeholder (testID "view-cues")
│   ├── MidiActivityDisplay.tsx           # Existing — unchanged
│   ├── PreferencesMenu.tsx               # Existing — unchanged
│   └── PerformMode.tsx                   # Existing — unchanged
├── edit-view/
│   ├── EditViewContext.tsx               # NEW — provider, default 'setup', session-scoped state
│   └── useEditView.ts                    # NEW — hook returning { editView, setEditView }
├── layout/
│   ├── breakpoints.ts                    # NEW — exports TABLET_MIN_WIDTH = 600
│   └── useLayoutMode.ts                  # NEW — returns 'phone' | 'tablet' via useWindowDimensions
├── mode/                                 # Existing — unchanged
├── midi/                                 # Existing — unchanged
├── prefs/                                # Existing — unchanged
└── theme/
    └── colors.ts                         # UPDATE — add segmented-selected, menu-surface, menu-divider tokens

__tests__/
├── app/
│   ├── EditMode.test.tsx                 # UPDATE — assert tablet vs phone variants render correctly;
│   │                                      #          assert body swaps with context changes
│   ├── EditViewSegmented.test.tsx        # NEW
│   ├── EditViewDropdown.test.tsx         # NEW — open/close, select, backdrop-dismiss, Perform selects mode change
│   └── Shell.test.tsx                    # UPDATE — assert sub-view preserved across Edit → Perform → Edit
├── edit-view/
│   └── EditViewContext.test.tsx          # NEW — default, setEditView, no persistence, preservation across EditMode remounts
├── layout/
│   └── useLayoutMode.test.tsx            # NEW — width boundary cases
└── (existing tests preserved)
```

**Structure Decision**: Single-project layout (Option 1), consistent with features 001 and 002. Two new sibling directories under `src/`: `src/edit-view/` (holds context + hook) and `src/layout/` (holds breakpoint constant + hook). These live alongside `src/mode/`, `src/midi/`, `src/prefs/`, and `src/theme/`, matching the established pattern of one top-level folder per small concern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No principle violations. The entries below track design choices that reviewers should see explicitly:

| Choice | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Width-based layout-mode hook (`useLayoutMode`) rather than `Platform.isPad` / `DeviceInfo.isTablet` | The spec's edge case requires the iPad split-view 1/3 configuration to behave as phone even though the device IS an iPad. Only a width-based test reliably catches this. | Device-class checks misclassify split-view iPads and foldables in their folded state. Those are both first-class supported surfaces, so the simpler check is wrong. |
| Lift `editView` to a Shell-level context rather than keeping it as `useState` in `EditMode` | FR-009 and US3 require the sub-view selection to survive Edit → Perform → Edit. Because `Shell` conditionally renders `<EditMode />` vs `<PerformMode />`, `EditMode` unmounts on mode switch and its `useState` would be lost. | Keeping state in `EditMode` would require re-mounting-preserving hacks (portals, ref-caching) to meet the spec. A dedicated session context is the idiomatic React answer and mirrors `ModeContext`. |
| Custom segmented control + custom dropdown rather than a third-party UI library | No dependency cost, full control over dark-mode styling, accessibility, and the focus-ring/keyboard behavior required by Principle VII. The two components together are small (~150 LOC each). | `@react-native-segmented-control/segmented-control` is iOS-only (wraps UISegmentedControl). Cross-platform dropdowns add more surface area than they save and none match the app's dark-mode tokens without theming work. |

**Re-check after Phase 1 design**: evaluated against the data model, UI surfaces contract, research decisions, and quickstart. No new principle exposures:

- **Principle I** — `EditViewContext` has no I/O, cannot fail. Each placeholder view is a leaf; a render error in one does not affect the header or sibling views. No state mutation happens on the MIDI path.
- **Principle II** — MIDI path is untouched; `useLayoutMode` re-renders on window-size change do not propagate into `MidiInputContext` because they are separate providers.
- **Principle III** — trivially maintained.
- **Principle IV** — UI chrome is exempt. Tests written anyway, listed in Project Structure.
- **Principle V** — branch + spec + plan layout satisfies this.
- **Principle VI** — hit targets, touch-only, tablet-first design, dark-only theming are pinned in `contracts/ui-surfaces.md`.
- **Principle VII** — keyboard navigation model, focus management on dropdown open/close, state-beyond-color indicators, and contrast budgets are pinned in `contracts/ui-surfaces.md`.

**Gate result (post-Phase 1)**: PASS.
