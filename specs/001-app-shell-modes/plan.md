# Implementation Plan: App Shell — Edit and Perform Modes

**Branch**: `001-app-shell-modes` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-app-shell-modes/spec.md`

## Summary

Introduce the top-level app shell and its two mutually-exclusive user-facing modes, **Edit** and **Perform**. A single app-level `Mode` value determines which surface is rendered: an Edit surface with a top header bar containing a "Perform" button on the left, or a Perform surface rendered as a full-screen black background with an "x" close control in the top-left. Mode transitions are immediate, session-scoped, and reset to Edit on cold launch. The feature introduces no MIDI, audio, or show-state behavior — it only establishes the shell that later features render inside.

Technical approach: add a small `ModeContext` to hold the current mode in session state, render one of two sibling surfaces (`EditMode`, `PerformMode`) inside the existing `App` root, and wire the two controls to toggle the context value. Dark-theme tokens live in a single `theme/colors` module. No new runtime dependencies are required; the existing Expo SDK 54 + React Native 0.81 + React 19 stack is sufficient.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict mode)
**Primary Dependencies**: React Native 0.81.5, Expo SDK ~54.0.33, React 19.1, expo-status-bar ~3.0.9. `@expo/vector-icons` (ships with Expo) for the "x" close glyph. `react-native-web` 0.21.x is present in `dependencies` but is not exercised by this feature.
**Storage**: None. The `Mode` value lives in-memory only. Per FR-002 it resets to Edit on every cold launch.
**Testing**: `jest-expo` preset (bundled with Expo) + `@testing-library/react-native` for component/behavioral tests. No E2E framework is introduced by this feature.
**Target Platform**: iOS 17+ and Android (Pixel Tablet class) via Expo. Tablet form factors are the reference design per `docs/design.md`; phone layouts use the same header+body treatment at smaller dimensions.
**Project Type**: mobile-app (Expo managed workflow, single project at repo root)
**Performance Goals**: Mode transition under 100ms from tap to fully-rendered target mode on the primary tablet target (SC-005). No background work; no allocations outside the React render cycle.
**Constraints**: Dark theme only (Principle VI); touch targets ≥44pt (iOS) / ≥48dp (Android); keyboard-reachable controls with visible focus on dark backgrounds (Principle VII); no hover affordances; no multi-touch requirements.
**Scale/Scope**: Two surfaces (Edit shell, Perform shell), one piece of shared state (`Mode`), two interactive controls ("Perform" button, "x" close), one theme module. Expected delta is small — on the order of 150–250 lines of TypeScript plus tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `constitution.md` v1.1.0. Each principle is either **applicable** (with concrete compliance plan) or **not applicable** (trivially compliant — the feature does not touch that domain).

### I. Reliability During Performance (NON-NEGOTIABLE) — **applicable, pass**

- The mode toggle itself cannot crash any cue because there are no cues yet.
- Mode rendering MUST NOT throw or block; both `EditMode` and `PerformMode` are simple stateless renders of session state plus one handler each.
- **Open note (not a violation):** FR-002 requires cold launch to land in Edit, which differs from the constitution's broader intent that an app restart mid-show resumes the current cue. That tension will be revisited when show/cue state is introduced; at that point the app will likely restore `Mode=Perform` only if a show is active. For this feature (no show state yet), Edit-on-cold-launch is consistent with the constitution's intent — there's nothing to resume — and matches the spec's Assumption.

### II. Real-Time MIDI Path Integrity — **not applicable, trivially pass**

- No MIDI I/O is introduced or touched by this feature. The mode toggle does not run on the MIDI dispatch path and has no latency interaction with it.

### III. Hardware-First Sound Architecture — **not applicable, trivially pass**

- No audio synthesis, sampler, or outbound MIDI events are introduced.

### IV. Test-First for Stage-Affecting Logic — **applicable, scoped pass**

- The mode toggle is NOT stage-affecting (it produces no MIDI, no sound, no visible stage output). Principle IV's strict test-first gate therefore does not apply.
- Best-practice tests are still written: `ModeContext` behavior (initial value, transitions), and `EditMode` / `PerformMode` rendering + control-interaction tests. These are not required by the principle but are cheap insurance and match the spec's acceptance scenarios.

### V. Spec-Driven, Feature-Branch Development — **applicable, pass**

- Spec exists at `specs/001-app-shell-modes/spec.md`, feature branch `001-app-shell-modes` is checked out via the mandatory `speckit.git.feature` hook. Constitution Check is this section. PR will link the spec directory.

### VI. Touch-First Performer UX — **applicable, pass**

- All interactive elements ("Perform" button, "x" close control) are designed for touch with ≥44pt iOS / ≥48dp Android hit areas and no hover-only affordances.
- Dark theme for both modes — Edit uses a dark header/surface palette, Perform is pure black.
- Tablet is the reference layout; phone inherits the same header bar unchanged (there is no graphical map to downgrade at this stage, so phone/tablet parity is trivial).
- No desktop-specific UI is introduced; web build inherits the touch design unchanged.

### VII. Focused Accessibility — **applicable, pass**

- Both controls MUST be reachable via an attached keyboard with visible focus rings (FR-012). `accessible`, `accessibilityRole="button"`, and `accessibilityLabel` props will be set.
- Header text and button label MUST meet WCAG AA contrast against the dark-theme surface color — colors in `theme/colors` will be picked to satisfy this and documented in `research.md`.
- No information is conveyed by color alone — every control has a shape and a label.

**Gate result (pre-Phase 0)**: PASS. No violations. `Complexity Tracking` table is empty.

**Re-check after Phase 1 design**: Re-evaluated against the data model, UI contract, and quickstart. No new principle exposures:

- Data model is an in-memory enum with two values and two allowed transitions — no persistence, no MIDI, no stage side-effects. Principles I–III still trivially compliant.
- UI contract explicitly names the `accessibilityRole`, `accessibilityLabel`, keyboard focus behavior, and WCAG AA contrast requirements for both surfaces. Principles VI and VII are actively enforced by the contract, not merely accommodated.
- Quickstart covers all three acceptance scenarios plus rotation, backgrounding, cold-launch-from-perform, and keyboard navigation.

**Gate result (post-Phase 1)**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-app-shell-modes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── ui-surfaces.md
├── checklists/
│   └── requirements.md  # Already created by /speckit.specify
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
App.tsx                          # Existing entry — will wrap in <ModeProvider> and render <Shell/>
index.ts                         # Existing — unchanged

src/
├── app/
│   ├── Shell.tsx                # Chooses which surface to render based on current Mode
│   ├── EditMode.tsx             # Header bar + "Perform" button + empty body placeholder
│   └── PerformMode.tsx          # Black full-screen surface + "x" close control
├── mode/
│   ├── ModeContext.tsx          # React Context provider + value type
│   └── useMode.ts               # Hook returning { mode, setMode } or similar tuple
└── theme/
    └── colors.ts                # Dark-theme tokens (surface, border, text, focus, perform-black)

__tests__/
├── mode/
│   └── ModeContext.test.tsx     # Initial value, transition correctness
└── app/
    ├── Shell.test.tsx           # Renders EditMode initially, switches on setMode
    ├── EditMode.test.tsx        # Header bar renders, tapping "Perform" calls setMode('perform')
    └── PerformMode.test.tsx     # Black background, tapping "x" calls setMode('edit'), a11y props
```

**Structure Decision**: Option 1 (Single project). Source lives under a new `src/` tree at repo root; `App.tsx` and `index.ts` remain where Expo's `"main": "index.ts"` expects them. Tests live under `__tests__/` at repo root, which is the `jest-expo` default discovery path. No `ios/` or `android/` native folders are introduced (Expo managed workflow).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to track.
