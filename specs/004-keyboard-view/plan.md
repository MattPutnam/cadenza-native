# Implementation Plan: Keyboard Display Component

**Branch**: `004-keyboard-view` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-keyboard-view/spec.md`

## Summary

Ship a reusable, display-only piano-keyboard React component (`<Keyboard />`) plus an on-device Storybook workshop that hosts stories of the component. The component accepts `low` and `high` MIDI note numbers (contractually white keys) and a list of highlighted MIDI notes; it renders the full sequence of white and black keys between `low` and `high` inclusive, filled to the container's width, with any in-range highlighted notes drawn in blue. Dark-mode-only. No interactivity. No audio. No MIDI output.

Technical approach:

- **Component**: pure functional React component in `src/keyboard/Keyboard.tsx`. Layout is computed from the container width captured via `onLayout`, plus a pure helper (`src/keyboard/layout.ts`) that takes `(low, high, containerWidth)` and returns an array of key descriptors with absolute x/y/width/height. Rendering uses plain `<View>`s — white keys stacked in a `flex-row`; black keys overlaid via absolute positioning. No external rendering dep (no `react-native-svg`).
- **Storybook**: adopt `@storybook/react-native` v8.x, which runs Storybook inside the Expo dev client. A dedicated `.storybook/` config directory + an opt-in entry (`index.ts` switches between the real app and Storybook based on a build-time env var `EXPO_PUBLIC_STORYBOOK`). Two new npm scripts — `storybook` (launch Metro with the env set) and `storybook:generate` (regenerate the stories manifest). The existing App and dev-client flows are unchanged when the env var is not set.
- **Note-theory helpers**: a small local module (`src/keyboard/notes.ts`) defines `isWhiteKey(n)` and `whiteKeyCount(low, high)`. No new domain subsystem; these are pure functions used only by the keyboard module.
- **Theme tokens**: three additive entries in `src/theme/colors.ts` — `keyboardWhiteKey`, `keyboardBlackKey`, `keyboardHighlight` (the blue). The blue MAY reuse the existing `accent` value; a separate token lets the keyboard evolve independently. WCAG AA contrast is asserted in contracts.
- **Stories**: 8 stories in `src/keyboard/Keyboard.stories.tsx`, each exercising a specific range/highlight combination plus narrow/wide container wrappers.

No changes to native modules, MIDI subsystem, preferences, mode/edit-view state, or Edit-mode/Perform-mode surfaces. The keyboard component is not wired into any screen in this feature — later features (Setup / Patches / Cues) will consume it.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict). No new native code.
**Primary Dependencies**: React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). **New (dev-only):** `@storybook/react-native` (~8.x) and its required peer deps. Exact peer-dep list and install commands are pinned in research.md §2. No new runtime (non-dev) dependencies. No `react-native-svg`, no icon-library additions.
**Storage**: None. The keyboard component is stateless. Storybook persists its own last-selected-story index via AsyncStorage (already installed for feature 002).
**Testing**: `jest-expo` + `@testing-library/react-native` (existing). New unit targets: `__tests__/keyboard/notes.test.ts` (pure helpers), `__tests__/keyboard/layout.test.ts` (layout math), `__tests__/keyboard/Keyboard.test.tsx` (component). Storybook itself is not tested by Jest; manual QA verifies the workshop.
**Target Platform**: iOS 17+ (iPhone + iPad) and Android (phone + tablet). Storybook runs inside the dev client (not production builds). Web is not a target for Storybook in this feature.
**Project Type**: mobile-app (Expo Dev Client).
**Performance Goals**:
- Component re-layout after container width change: within one frame (≤ 16.7 ms on 60 Hz). Layout math is a single pass over the range; for a full 88-key render that is ≤ 88 iterations — trivial.
- Full 88-key initial render: under 33 ms from mount to first paint on the primary tablet target.
- Storybook story switch: under 200 ms (user-perceptible but not blocking).
**Constraints**:
- **Principle VI** — dark mode only; no hover states; no multi-touch; no tap handlers on keys (display-only per FR-012).
- **Principle VII** — highlighted-key blue MUST meet WCAG AA contrast against BOTH the white-key neutral AND the black-key neutral so a highlighted black key is visibly distinct from an unhighlighted black key.
- **Principle I** — the component must not crash on unexpected props. White-key-boundary contract violations MAY produce a degraded render (e.g., an error placeholder) but MUST NOT throw uncaught exceptions.
- Storybook is dev-tooling only: no Storybook code may ship in production builds. An env-guarded entry point ensures production builds do not render Storybook.
**Scale/Scope**: 1 component + 2 pure helpers + 1 story file (8 stories) + Storybook config. Expected delta ~400–700 LOC in TS/TSX, plus ~80 LOC of Storybook scaffolding. No source-file deletions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `constitution.md` v1.1.0.

### I. Reliability During Performance (NON-NEGOTIABLE) — **applicable, pass**

The component is display-only with no stage-affecting path. Layout math is synchronous and bounded (O(range-size) ≤ 128). Invalid inputs (black-key boundary) do not throw — at worst the component renders an error placeholder or degenerate layout. Storybook does not ship in production builds, so its failure modes cannot affect a live show.

### II. Real-Time MIDI Path Integrity — **applicable, trivially pass**

No MIDI dispatch code is touched. The component consumes MIDI note numbers as plain integers; it does not subscribe to live MIDI, does not emit MIDI, and does not hold any state that the MIDI path depends on.

### III. Hardware-First Sound Architecture — **not applicable**

No audio code introduced.

### IV. Test-First for Stage-Affecting Logic — **not applicable (UI chrome)**

Per Principle IV's second bullet, chrome and editor-only surfaces are exempt from test-first. Tests are still written for the pure helpers (`isWhiteKey`, `whiteKeyCount`, key-layout math) and for the component's render contract, because those tests are cheap and protect follow-up features (Setup / Patches / Cues) that will consume the component.

### V. Spec-Driven, Feature-Branch Development — **applicable, pass**

Spec exists on `004-keyboard-view`; plan lives on the same branch; tasks and implementation stay on this branch until merged to `main`.

### VI. Touch-First Performer UX — **applicable, pass**

- **No hover states**: the component has no interactive affordances.
- **No multi-touch**: non-interactive.
- **Hit targets**: N/A — the component is not tappable. Interactivity is explicitly out of scope (FR-012).
- **Dark mode only**: the component ships one theme, using existing and new dark-mode tokens.
- **Tablet-first**: the component fills any width it's given and looks right at both tablet and phone widths. No per-layout variant needed.

### VII. Focused Accessibility — **applicable, pass**

- **Color contrast**: the blue highlight MUST meet WCAG AA (4.5:1) against BOTH the white-key neutral AND the black-key neutral. This is asserted in contracts/keyboard-component.md §Theme tokens and verified in a Phase-6 task.
- **Keyboard reachability**: N/A — the component is non-interactive, so there are no focusable children.
- **State beyond color**: FR-006 accepts color as the sole differentiator for highlighted keys in this display-only context. Users of Cadenza are sighted keyboardists (per Principle VII); this is consistent with the accessibility scope.
- **Screen-reader**: a single `accessibilityLabel` at the component root (e.g., "Keyboard, range C3 to C5, 3 highlighted keys") is cheap and included. Individual keys are not assistive-labeled because they are non-interactive.

**Gate result (pre-Phase 0)**: PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/004-keyboard-view/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/                   # Phase 1 output
│   └── keyboard-component.md
├── checklists/
│   └── requirements.md          # Created by /speckit.specify
└── tasks.md                     # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── keyboard/
│   ├── Keyboard.tsx                  # NEW — the component itself
│   ├── Keyboard.stories.tsx          # NEW — Storybook stories (8)
│   ├── layout.ts                     # NEW — pure: (low, high, width) → key descriptors
│   ├── notes.ts                      # NEW — pure: isWhiteKey, whiteKeyCount, toNoteName (used by a11y label)
│   └── types.ts                      # NEW — KeyDescriptor, KeyboardProps, etc.
├── theme/
│   └── colors.ts                     # UPDATE — add keyboardWhiteKey, keyboardBlackKey, keyboardHighlight
├── app/                              # UNCHANGED (component not wired into any screen in this feature)
├── midi/                             # UNCHANGED
├── mode/                             # UNCHANGED
├── prefs/                            # UNCHANGED
├── edit-view/                        # UNCHANGED
└── layout/                           # UNCHANGED

.storybook/                           # NEW — Storybook config (dev-tooling only)
├── index.tsx                         # StorybookApp component consumed by the app entry
├── main.ts                           # Storybook main config (addons, framework)
└── storybook.requires.ts             # Auto-generated — imports each *.stories.tsx file

index.ts                              # UPDATE — branch on EXPO_PUBLIC_STORYBOOK env var
package.json                          # UPDATE — add Storybook deps and scripts

__tests__/
└── keyboard/
    ├── notes.test.ts                 # NEW — white/black key classification
    ├── layout.test.ts                # NEW — layout math contracts
    └── Keyboard.test.tsx             # NEW — component render contract
```

**Structure Decision**: Single-project layout (Option 1), consistent with features 001–003. Component code lives in a new `src/keyboard/` sibling to the other per-concern directories. Stories are co-located with the component (the canonical Storybook pattern). Storybook scaffolding lives at the repo root under `.storybook/` as the tool requires. No `src/components/` umbrella is introduced — if future features add more shared display components we will revisit.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No principle violations. The entries below surface design choices that reviewers should see explicitly:

| Choice | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Adopt `@storybook/react-native` (on-device Storybook) rather than a web-based Storybook using `react-native-web` | On-device rendering exactly matches the surface the keyboard will appear on in production (real RN, real platform fonts, real device pixel ratio). Because the component fills container width and cares about pixel-exact key widths, web/simulated RN-web could hide layout bugs that only appear on-device. The dev-client infrastructure already exists from feature 002. | Web-based Storybook via `react-native-web` iterates faster in a browser but (a) needs a separate build pipeline, (b) risks layout drift vs. real iOS/Android, and (c) duplicates the preview surface we already have (the dev client). |
| Env-guarded entry-point toggle (`EXPO_PUBLIC_STORYBOOK`) rather than a separate Metro entry or a runtime in-app switch | Minimal friction: one line in `index.ts`, one npm script, no duplication of Metro config. Production builds leave the variable unset and receive the normal App entry; Storybook dev builds receive the `StorybookApp`. | A separate Metro entry fully excludes Storybook from production but materially complicates the build scripts without meaningfully reducing dev-build times. If bundle analysis later shows Storybook leaking into production we cut over to the separate-entry pattern without touching component code. |
| View-based rendering (absolute positioning for black keys) rather than `react-native-svg` | No new native dependency; `View` + layout props gives pixel-accurate rendering at any width because we control the arithmetic. SVG is unnecessary for plain rectangles. | `react-native-svg` expresses the layout declaratively but adds a native dep we do not otherwise need and surfaces its own dev-client configuration concerns. |

**Re-check after Phase 1 design**: evaluated against the data model, component contract, research decisions, and quickstart. No new principle exposures:

- **Principle I** — component render errors are contained; invalid props produce a bounded fallback (see data-model.md §Error handling).
- **Principle II** — the keyboard does not subscribe to or emit MIDI; no hot-path concern.
- **Principle III** — no audio code.
- **Principle IV** — UI chrome exempt; tests written for pure helpers + component render contract.
- **Principle V** — spec/plan/branch aligned.
- **Principle VI** — hit targets are N/A (non-interactive); dark mode only; tablet-first per fill-to-width behavior.
- **Principle VII** — WCAG AA contrast contract pinned in contracts/keyboard-component.md §Theme tokens; a11y label at component root.

**Gate result (post-Phase 1)**: PASS.
