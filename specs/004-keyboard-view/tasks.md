---

description: "Task list for Keyboard Display Component"
---

# Tasks: Keyboard Display Component

**Input**: Design documents from `/specs/004-keyboard-view/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/keyboard-component.md, quickstart.md

**Tests**: Included — UI chrome is exempt from Principle IV's test-first requirement, but the pure helpers (`isWhiteKey`, `whiteKeyCount`, `computeKeyboardLayout`, `toNoteName`) and the component's render contract are cheap and high-signal. Tests are listed after the implementation they cover.

**Organization**: Tasks are grouped by user story. User stories map to priorities from `spec.md`:

- **US1** — Keyboard display component (P1)
- **US2** — Storybook workshop (P2)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single-project mobile-app layout per plan.md. All paths are relative to the repository root `/Users/matthewputnam/code/cadenza-native/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline and (later) install Storybook. Storybook installation lives in US2 so Phase 1 stays small.

- [X] T001 Confirm `004-keyboard-view` branch is checked out and `npm test` + `npx tsc --noEmit` are both clean against the current tree before any edits land.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the pure data types, note-theory helpers, layout math, and theme tokens. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types

- [X] T002 [P] Create `src/keyboard/types.ts` exporting `KeyColor`, `KeyDescriptor`, `KeyboardLayout`, `KeyboardLayoutError`, and `KeyboardProps` per data-model.md §Value types and §KeyboardProps.

### Pure helpers

- [X] T003 [P] Create `src/keyboard/notes.ts` exporting `isWhiteKey(midi)`, `keyColor(midi)`, `whiteKeyCount(low, high)`, and `toNoteName(midi)` per data-model.md §KeyColor and §Note naming.
- [X] T004 [P] Create `src/keyboard/layout.ts` exporting `KEY_ASPECT = 5.5`, `BLACK_KEY_WIDTH_RATIO = 0.6`, `BLACK_KEY_HEIGHT_RATIO = 0.62`, and `computeKeyboardLayout(low, high, containerWidth): KeyboardLayout` per data-model.md §KeyboardLayout. Validation returns a `KeyboardLayoutError` value — NEVER throws. Depends on T002, T003.

### Theme tokens

- [X] T005 [P] Extend `src/theme/colors.ts` with three additive tokens from contracts/keyboard-component.md §7: `keyboardWhiteKey` (suggested `#E8E8EA`), `keyboardBlackKey` (suggested `#1A1A1F`), `keyboardHighlight` (reuse `accent` value `#2563EB`). Add inline comments noting the WCAG AA contrast targets. Exact hex values may be adjusted in T016 if contrast fails.

### Foundational tests

- [X] T006 [P] Create `__tests__/keyboard/notes.test.ts` asserting every contract row in contracts/keyboard-component.md §6 "notes.ts": `isWhiteKey` for all 12 pitch classes (0, 2, 4, 5, 7, 9, 11 white; 1, 3, 6, 8, 10 black), `whiteKeyCount(48, 72) === 15`, `whiteKeyCount(21, 108) === 52`, `whiteKeyCount(60, 60) === 1`, `toNoteName` for MIDI 60/21/108. Depends on T003.
- [X] T007 [P] Create `__tests__/keyboard/layout.test.ts` asserting every contract row in contracts/keyboard-component.md §6 "layout.ts": success case for `(48, 72, 700)` returns 25 descriptors, white-key contiguity invariant, black-key centering invariant, zero-width returns empty keys with no error, four error codes (`low-not-white-key`, `high-not-white-key`, `low-greater-than-high`, `out-of-midi-range`). Depends on T004.

**Checkpoint**: Foundation ready. All pure helpers and types exist and are tested. User story implementation can now begin.

---

## Phase 3: User Story 1 — Keyboard display component (Priority: P1) 🎯 MVP

**Goal**: A developer can import and render `<Keyboard low={…} high={…} highlighted={…} />` anywhere in the app and see the keyboard fill its container's width, with the specified keys drawn blue.

**Independent Test**: Render the component in a test with a known range and highlight list; verify it emits the correct key `testID`s with the correct background colors and respects the container-width measurement. Tests are sufficient — no UI spike required at this stage (visual verification comes in US2 / Phase 6 manual QA).

### Implementation for User Story 1

- [X] T008 [US1] Create `src/keyboard/Keyboard.tsx` implementing the contract in contracts/keyboard-component.md §§2–4:
  - Props `{ low, high, highlighted?, testID?, accessibilityLabel? }` from `./types`.
  - Internal `const [width, setWidth] = useState(0);` captured from root `onLayout`.
  - `const layout = useMemo(() => computeKeyboardLayout(low, high, width), [low, high, width]);`.
  - Error path: when `layout.error !== null`, render the `keyboard-error` placeholder with `keyboard-error-message` text starting with `"Keyboard: invalid range"`. In `__DEV__`, also emit `console.warn` with the offending props and error code.
  - Success path: render white keys first then black keys (so blacks overlay), each as a `<View>` with `testID="keyboard-key-<midi>"`, `pointerEvents="none"`, absolute `left/top/width/height` from the descriptor, and `backgroundColor` of `colors.keyboardHighlight` if `descriptor.highlighted` else `colors.keyboardWhiteKey` / `colors.keyboardBlackKey`. White keys additionally get a 1 px right border using `colors.border` (except the last white key).
  - Root `<View>` sizing: `width: '100%', height: layout.height, position: 'relative'`, `accessibilityRole="image"`, `accessibilityLabel` from the `accessibilityLabel` prop or the generator described in contracts §4.
  - A small helper `generateAccessibilityLabel(low, high, highlighted)` implements the a11y-label generator (co-located in `Keyboard.tsx`, not exported).
  - Resolve `highlighted` → `Set<number>` once (dedupe + O(1) lookup); filter by range at the same pass.
  - Depends on T002, T003, T004, T005.

### Tests for User Story 1

- [X] T009 [US1] Create `__tests__/keyboard/Keyboard.test.tsx` asserting every contract row in contracts/keyboard-component.md §6 "Keyboard.tsx":
  - Root `testID` default `"keyboard"` and override.
  - After firing `onLayout` with `nativeEvent.layout.width = 700` on the root, range `48..72` renders exactly 25 key `testID`s.
  - `highlighted=[60]` renders `keyboard-key-60` with `backgroundColor === colors.keyboardHighlight`; `keyboard-key-64` does not.
  - `highlighted=[200]` with range `48..72` renders no highlighted keys.
  - `low=61` (a black key) renders `keyboard-error` and does NOT render any `keyboard-key-*`.
  - Default `accessibilityLabel` for `(48, 72, [])` === `"Keyboard, range C3 to C5, 0 highlighted"`; for `(48, 72, [60, 64, 67])` === `"Keyboard, range C3 to C5, 3 highlighted: C4, E4, G4"`.
  - Caller-supplied `accessibilityLabel="custom"` overrides the generator.
  - No key `<View>` has an `onPress` prop (component is display-only).
  - Depends on T008.

**Checkpoint**: The component is implemented and tested. It renders correctly for every spec'd case. MVP shippable via import into future features.

---

## Phase 4: User Story 2 — Storybook workshop (Priority: P2)

**Goal**: A developer can run `npm run storybook` and browse the keyboard component in isolation, with 8 stories covering the primary prop combinations. The normal app is unaffected when the `EXPO_PUBLIC_STORYBOOK` env var is unset.

**Independent Test**: `npm run storybook` launches the dev client with the Storybook UI; every story in `Keyboard.stories.tsx` renders without throwing; setting `EXPO_PUBLIC_STORYBOOK` to empty (or unsetting it) returns the normal app on next Metro restart.

### Implementation for User Story 2

- [X] T010 [US2] Run the Storybook initializer from the repo root to scaffold `.storybook/`, add `@storybook/react-native` to `devDependencies`, and update `package.json` with the Storybook CLI's boilerplate:
  ```bash
  npx storybook@latest init --type react_native
  ```
  If the initializer creates `.storybook/main.ts`, `.storybook/index.tsx`, and `.storybook/storybook.requires.ts`, accept them as-is. Review any changes it makes to `metro.config.js` or `babel.config.js` and keep them minimal (no extra plugins beyond what Storybook requires). Commit the `package.json`/lockfile changes together with the `.storybook/` tree.

- [X] T011 [US2] Update `/Users/matthewputnam/code/cadenza-native/index.ts` to branch between the real app and the Storybook app based on `process.env.EXPO_PUBLIC_STORYBOOK === 'true'`, per research.md §2:
  ```ts
  import { registerRootComponent } from 'expo';
  import App from './App';
  import StorybookApp from './.storybook';
  registerRootComponent(
    process.env.EXPO_PUBLIC_STORYBOOK === 'true' ? StorybookApp : App,
  );
  ```
  Preserve the existing top-of-file content (imports, comments). Depends on T010.

- [X] T012 [US2] Add two npm scripts to `/Users/matthewputnam/code/cadenza-native/package.json`:
  - `"storybook": "EXPO_PUBLIC_STORYBOOK=true expo start"`
  - `"storybook:generate": "sb-rn-get-stories --config-path .storybook"`
  Keep existing scripts unchanged. Depends on T010.

- [X] T013 [P] [US2] Create `/Users/matthewputnam/code/cadenza-native/src/keyboard/Keyboard.stories.tsx` with exactly the 8 stories enumerated in contracts/keyboard-component.md §8. Export a default meta with `title: "Components/Keyboard"` and `component: Keyboard`. Each story wraps `<Keyboard />` in a `<View>` with appropriate padding; narrow/wide container stories wrap in a `<View style={{ width: 320 | 1000 }}>` so the component fills that width regardless of device size. Do NOT wire any Context/Provider — the component has no context dependencies. Depends on T008 (component exists).

- [X] T014 [US2] Run `npm run storybook:generate` once to produce `.storybook/storybook.requires.ts` with the new stories file registered. Re-run whenever `Keyboard.stories.tsx` is added/removed. Depends on T013.

**Checkpoint**: Storybook runs on the dev client with all 8 keyboard stories listed and renderable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify everything compiles, every test passes, contrast targets hold, and the feature works on-device across the four target form factors.

### Automated checks

- [X] T015 [P] Run `npm test` and confirm all suites are green — 142 tests (from feature 003) plus the new keyboard tests MUST pass without exception. If a pre-existing test breaks, the failure is a regression and must be resolved before merging.
- [X] T016 [P] Run `npx tsc --noEmit` and confirm no TypeScript errors across the whole project.

### Contrast verification

- [X] T017 [P] Verify WCAG AA contrast for every foreground/background pair in contracts/keyboard-component.md §7 using an accessibility inspector (iOS Accessibility Inspector, Android Accessibility Scanner, or an online contrast checker) against the hex values chosen in T005:
  - `keyboardHighlight` on `keyboardWhiteKey` ≥ 4.5:1
  - `keyboardHighlight` on `keyboardBlackKey` ≥ 4.5:1
  - `keyboardWhiteKey` on `surface` ≥ 3:1
  - `keyboardBlackKey` on `surface` ≥ 3:1
  If any pair fails, update the offending token in `src/theme/colors.ts` and re-test. Document final ratios in a short comment next to each token.

### Manual QA (per quickstart.md)

- [X] T018 Run the full quickstart.md walkthrough (US2 Storybook stories + the edge-case spot checks) on an iPad (or iPad simulator) and record any deviations in this task's notes; fix any spec drift before merge. Depends on T014, T017.
- [X] T019 Run the same quickstart.md walkthrough on an iPhone (or iPhone simulator). Depends on T014, T017.
- [X] T020 Run the same quickstart.md walkthrough on an Android tablet emulator. Depends on T014, T017.
- [X] T021 Run the same quickstart.md walkthrough on an Android phone emulator. Depends on T014, T017.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; run immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS user stories. Leaf tasks T002–T006 can run in parallel; T007 (layout tests) depends on T004.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational AND on US1 (T013 needs the component to exist). T010 (Storybook init) can be kicked off in parallel with US1 implementation if staffed separately.
- **Polish (Phase 5)**: Depends on US1 and US2 being complete. Automated checks (T015, T016) can run at any time once the tree compiles; contrast check (T017) depends on tokens from T005.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No dependency on US2. MVP.
- **US2 (P2)**: Depends on US1 for `Keyboard.stories.tsx` content. Storybook infrastructure (T010–T012) is independent of US1 and could land earlier if desired, but the stories themselves need the component.

### Within Each User Story

- Implementation first (new files), then tests. Tests are cheap and could be written before implementation if strict TDD is preferred, but Principle IV exempts UI chrome from that requirement.
- Storybook infrastructure (T010–T012) must complete before story files are registered (T013, T014).

### Parallel Opportunities

- Phase 2: T002, T003, T005, T006 touch different files and can run in parallel. T004 depends on T002 + T003; T007 depends on T004.
- Phase 4: T010 is serial (initializer). T011, T012 can run in parallel after T010. T013 can run in parallel with T011/T012 once T008 exists.
- Phase 5: T015, T016, T017 run in parallel; T018–T021 are per-device manual passes, all parallelizable in wall-clock time.

---

## Parallel Example: Phase 2 Foundational

```bash
# All independent leaf tasks — different files, no cross-dependencies.
Task: "Create src/keyboard/types.ts"                             # T002
Task: "Create src/keyboard/notes.ts"                             # T003
Task: "Extend src/theme/colors.ts with 3 tokens"                 # T005
# T004 depends on T002 + T003:
Task: "Create src/keyboard/layout.ts (after T002, T003)"         # T004
# Tests parallel with each other once their targets exist:
Task: "Create __tests__/keyboard/notes.test.ts (after T003)"     # T006
Task: "Create __tests__/keyboard/layout.test.ts (after T004)"    # T007
```

---

## Implementation Strategy

### MVP scope

**MVP = Phases 1 + 2 + 3 (US1 only).**

The component is fully implemented and verified by tests. Future features (Setup / Patches / Cues) can import and use it directly. Storybook is a developer-convenience tool that is not required for the component to be correct.

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T007).
3. Complete Phase 3: User Story 1 (T008–T009).
4. **STOP and VALIDATE**: `npm test` green, `tsc` clean. Ship or hold for US2.

### Incremental delivery

- **Increment 1 (MVP)**: Phases 1 + 2 + 3. Component + tests. Downstream features can consume it.
- **Increment 2**: Phase 4 (Storybook). Workshop for visual development.
- **Increment 3 (pre-merge)**: Phase 5. Contrast check + multi-device manual QA.

### Parallel team strategy

With two developers after Phase 2 completes:

- **Developer A** takes US1 (T008, T009).
- **Developer B** takes Storybook infrastructure (T010, T011, T012) — this is independent of US1 and can be done while A implements the component. T013 (stories file) waits for T008 to land; T014 runs after T013.
- Either developer picks up Phase 5 polish once both US phases are complete.

---

## Notes

- [P] tasks = different files, no dependencies — safe to execute in parallel.
- [Story] label ties each task to a user story for traceability; Setup, Foundational, and Polish tasks have no story label by design.
- Per Principle IV, behavioral tests for UI chrome are **optional**. We include them because the harness exists; they should pass, not be skipped.
- Commit after each task or per logical group. Small commits make pre-merge review easier.
- Do not introduce new runtime npm dependencies. Storybook (dev-only) is the single new dependency permitted by the plan.
- Do not wire the keyboard component into `EditMode`, `PerformMode`, or any other screen in this feature. Integration into specific surfaces (Setup, Patches, Cues) is a follow-up feature.
- Stop at any checkpoint to validate the story independently on-device before proceeding.
