---

description: "Task list for feature 001-app-shell-modes"
---

# Tasks: App Shell — Edit and Perform Modes

**Input**: Design documents from `/specs/001-app-shell-modes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-surfaces.md, quickstart.md

**Tests**: Behavioral tests are INCLUDED per the feature's plan (see `plan.md` Constitution Check, Principle IV section, and `research.md` §2). Principle IV does not gate this feature, but the plan opted into test coverage for the shell and its context; tasks below reflect that.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 or US2)
- Include exact file paths in descriptions

## Path Conventions

- **Mobile app (Expo managed, single project at repo root)**: `src/`, `__tests__/`, `App.tsx`, `package.json` all at the repository root.
- All paths below are relative to the repository root `/Users/matthewputnam/code/cadenza-native/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add test tooling and Jest configuration. No source code yet.

- [X] T001 Install dev dependencies `@testing-library/react-native` and `@testing-library/jest-native` (and confirm `jest-expo` is resolvable as a transitive of `expo`) by running `npm install --save-dev @testing-library/react-native @testing-library/jest-native`, updating `package.json` and `package-lock.json`.
- [X] T002 Configure Jest in `package.json`: add a top-level `"jest"` block with `"preset": "jest-expo"`, `"setupFilesAfterEach": ["@testing-library/jest-native/extend-expect"]` (or equivalent), and reasonable `transformIgnorePatterns` for RN/Expo; add `"test": "jest"` and `"test:watch": "jest --watch"` scripts.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dark-theme tokens and the mode state primitive that both user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 [P] Create `src/theme/colors.ts` exporting dark-theme tokens (`surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `focusRing`, `performBlack`). Include JSDoc next to each token documenting the contrast pair(s) it is intended to sit against and the approximate contrast ratio so reviewers can verify WCAG AA.
- [X] T004 [P] Create `src/mode/ModeContext.tsx` exporting the `Mode` type (`'edit' | 'perform'`), a `ModeContext` with a sentinel default that signals "no provider," and a `ModeProvider` component whose initial `mode` is `'edit'`. The provider MUST NOT import or use `AsyncStorage`, `expo-secure-store`, or any persistent storage (FR-002).
- [X] T005 Create `src/mode/useMode.ts` exporting a `useMode()` hook that reads `ModeContext` and throws a clear developer-facing error when used outside a `ModeProvider`. (Depends on T004.)

**Checkpoint**: Foundation ready — both user stories can now begin.

---

## Phase 3: User Story 1 - Switch between Edit and Perform modes (Priority: P1) 🎯 MVP

**Goal**: A performer can tap "Perform" to enter Perform mode, and tap the "x" to return to Edit mode, with the visual contract defined in `contracts/ui-surfaces.md`.

**Independent Test**: Launch the app, tap "Perform," verify black screen with "x" in top-left, tap "x," verify return to Edit header. Repeat round trip several times.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**

- [X] T006 [P] [US1] Create `__tests__/mode/ModeContext.test.tsx` asserting (a) initial value is `'edit'` under `<ModeProvider>`, (b) `setMode('perform')` flips `mode` to `'perform'` on next render, (c) `setMode('edit')` flips back, and (d) `useMode()` called outside a provider throws a developer-facing error.
- [X] T007 [P] [US1] Create `__tests__/app/EditMode.test.tsx` that renders `<EditMode />` inside a `<ModeProvider>` and asserts (a) a header landmark exists at the top, (b) a button accessible by role `"button"` and label `"Perform"` is present on the left, (c) activating the button causes the surrounding `mode` to become `'perform'`, and (d) colors in the DOM/style come from `theme.colors` tokens (no raw hex).
- [X] T008 [P] [US1] Create `__tests__/app/PerformMode.test.tsx` that renders `<PerformMode />` inside a `<ModeProvider value={'perform'}>` (or equivalent setup) and asserts (a) the background color is `theme.colors.performBlack`, (b) no header landmark is present, (c) a button accessible by role `"button"` and label `"Exit Perform mode"` is present in the top-left, (d) activating it causes `mode` to become `'edit'`, and (e) no other visible text or icons appear.
- [X] T009 [P] [US1] Create `__tests__/app/Shell.test.tsx` that renders `<Shell />` inside a `<ModeProvider>` and asserts (a) when `mode === 'edit'` the Edit landmark is present and the Perform landmark is absent, and (b) after calling `setMode('perform')` via the hook, the inverse holds.

### Implementation for User Story 1

- [X] T010 [P] [US1] Implement `src/app/EditMode.tsx`: a full-width header bar using `theme.colors.surface` / `surfaceElevated` at the top, containing a `Pressable` "Perform" button on the left with `accessible`, `accessibilityRole="button"`, `accessibilityLabel="Perform"`, visible focus ring using `theme.colors.focusRing`, and `hitSlop` or padding sufficient for a ≥44pt iOS / ≥48dp Android touch target. Below the header render an empty body view (placeholder) using `theme.colors.surface`. The component reads `useMode()` and calls `setMode('perform')` on activation. Must satisfy T007.
- [X] T011 [P] [US1] Implement `src/app/PerformMode.tsx`: a full-screen `View` with `backgroundColor: theme.colors.performBlack` and `flex: 1`. In its top-left corner, render a `Pressable` "x" close control using `@expo/vector-icons` Ionicons `"close"` (or equivalent), sized so the touch target is ≥44pt iOS / ≥48dp Android including any surrounding padding, with `accessible`, `accessibilityRole="button"`, `accessibilityLabel="Exit Perform mode"`, and a visible focus ring using `theme.colors.focusRing` that remains readable against black. The component reads `useMode()` and calls `setMode('edit')` on activation. Must satisfy T008.
- [X] T012 [US1] Implement `src/app/Shell.tsx`: a stateless component that calls `useMode()` and returns `<EditMode />` when `mode === 'edit'`, otherwise `<PerformMode />`. No other logic. Must satisfy T009. (Depends on T010, T011.)
- [X] T013 [US1] Rewrite `App.tsx` to replace the current "Hello, World!" tree with `<ModeProvider><Shell /></ModeProvider>` wrapped in the existing expo-status-bar setup (status bar style `"light"` to remain readable against dark/black backgrounds). Remove the old `greeting` `StyleSheet` entry; keep `index.ts` unchanged. (Depends on T012.)

**Checkpoint**: At this point, US1 is fully functional and testable independently. Acceptance scenarios 1 and 2 (and 3) from `spec.md` pass.

---

## Phase 4: User Story 2 - Predictable launch state (Priority: P2)

**Goal**: Cold launch lands in Edit mode regardless of prior state.

**Independent Test**: Force-quit the app while in Perform mode, re-open it, verify it opens in Edit mode.

### Tests for User Story 2

- [X] T014 [US2] Create `__tests__/app/PredictableLaunch.test.tsx` that (a) mounts `<ModeProvider><Shell /></ModeProvider>`, drives it into `'perform'` via `setMode`, unmounts the whole tree, remounts a fresh `<ModeProvider><Shell /></ModeProvider>` (simulating a cold launch), and asserts the new tree renders `<EditMode />`, and (b) statically asserts that `src/mode/ModeContext.tsx` does NOT import `AsyncStorage`, `expo-secure-store`, or any other persistent storage module (e.g., by reading the file and failing on a regex match — a small insurance that FR-002 isn't accidentally undone later).

### Implementation for User Story 2

None. The foundational `ModeProvider` (T004) already initializes to `'edit'` and has no persistence. US2 is satisfied by the existing implementation; T014 is the regression gate that keeps it true.

**Checkpoint**: At this point, Acceptance Scenario 1 from US2 passes, and the non-persistence invariant is locked in by test.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting verification after both stories are complete.

- [X] T015 [P] Run `npx tsc --noEmit` at repo root and verify zero type errors across `App.tsx`, `src/`, and `__tests__/`. Fix any surfaced issues in the specific file that triggered them.
- [X] T016 [P] Run `npm test` at repo root and verify all test files listed in `contracts/ui-surfaces.md` pass (T006, T007, T008, T009, T014). No snapshot tests are introduced by this feature; if Jest reports any new snapshots, the implementation drifted from the contract — reconcile before marking green.
- [X] T017 [P] Execute the manual smoke flow in `specs/001-app-shell-modes/quickstart.md` on the iPhone 15 simulator via `npm run ios:iphone`. Record pass/fail for each of SC-001 through SC-006 plus the edge-case spot checks (rotation, backgrounding, cold-launch-from-perform, keyboard nav).
- [X] T018 [P] Execute the same manual smoke flow on the Pixel_Tablet emulator via `npm run android:tablet`. Record pass/fail for the same criteria. Requires `ANDROID_HOME` exported in the shell.
- [X] T019 [P] Verify keyboard accessibility end-to-end: on the web build (`npm run web`) or on a simulator/emulator with a connected hardware keyboard, Tab MUST reach the "Perform" button in Edit mode and the "x" control in Perform mode, the focus ring using `theme.colors.focusRing` MUST be clearly visible on each, and Enter / Space MUST activate the focused control.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. Independently testable.
- **User Story 2 (Phase 4)**: Depends on Foundational. Independently testable. No dependency on US1 — T014 imports `Shell`, `EditMode`, `ModeProvider` which exist after US1 lands, so in practice run US2 after US1, though its test logic is independent.
- **Polish (Phase 5)**: Depends on both stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start immediately after Foundational completes.
- **US2 (P2)**: Can start after Foundational. Its one task (T014) imports components built in US1, so it runs after US1 in practice even though its logic is independent.

### Within Each User Story

- Tests (T006–T009 for US1, T014 for US2) MUST be written and FAIL before their corresponding implementation lands.
- Foundational files (`theme/colors.ts`, `mode/ModeContext.tsx`, `mode/useMode.ts`) before story files.
- `EditMode.tsx` and `PerformMode.tsx` before `Shell.tsx`; `Shell.tsx` before `App.tsx`.

### Parallel Opportunities

- T003, T004 can run in parallel (different files, no cross-dependency).
- T006–T009 can run in parallel (each is a new test file).
- T010 and T011 can run in parallel (different component files, both depend only on Foundational).
- T015, T016, T017, T018, T019 (Polish) can run in parallel once both stories are complete.

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests in parallel (they must fail before implementation):
Task: "Create __tests__/mode/ModeContext.test.tsx per T006"
Task: "Create __tests__/app/EditMode.test.tsx per T007"
Task: "Create __tests__/app/PerformMode.test.tsx per T008"
Task: "Create __tests__/app/Shell.test.tsx per T009"

# Then implement EditMode and PerformMode in parallel:
Task: "Implement src/app/EditMode.tsx per T010"
Task: "Implement src/app/PerformMode.tsx per T011"

# Sequentially: Shell (T012) → App.tsx (T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001, T002).
2. Phase 2: Foundational (T003, T004, T005).
3. Phase 3: US1 tests (T006–T009), confirm all FAIL.
4. Phase 3: US1 implementation (T010–T013), run tests, verify all PASS.
5. Manual smoke (subset of T017/T018) — confirm SC-001 and SC-002 on at least one simulator.
6. **Ship**: the MVP is a working Edit↔Perform toggle.

### Incremental Delivery

1. MVP as above.
2. Add US2 (T014) — guards non-persistence.
3. Polish (T015–T019) — typecheck, full test run, cross-device manual smoke, keyboard-nav check.

---

## Notes

- `[P]` tasks target different files and have no dependencies on incomplete tasks.
- `[Story]` label maps each implementation/test task to US1 or US2.
- Setup (Phase 1), Foundational (Phase 2), and Polish (Phase 5) tasks carry NO `[Story]` label by design.
- Tests must fail before the matching implementation lands; do not write a test and the implementation in the same commit if it can be avoided.
- Commit after each task or small logical group.
- Do not add snapshot tests — the UI contract is expressed via role + label queries, not rendered markup shape.
- Do not add any persistence for `Mode` in this feature. FR-002 is explicit and T014 enforces it.
