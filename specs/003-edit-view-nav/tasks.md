---

description: "Task list for Edit Mode View Switcher"
---

# Tasks: Edit Mode View Switcher

**Input**: Design documents from `/specs/003-edit-view-nav/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ui-surfaces.md, quickstart.md

**Tests**: Included — this feature is UI chrome and therefore exempt from Principle IV's test-first requirement, but the existing Jest harness makes behavioral tests cheap and the contracts file already enumerates what each test must assert. Tests are listed after the implementation they cover.

**Organization**: Tasks are grouped by user story. User stories map to priorities from `spec.md`:

- **US1** — Tablet: segmented view switcher (P1)
- **US2** — Phone: View dropdown (P1)
- **US3** — Session preservation across mode switches (P2)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single-project mobile-app layout per plan.md. All paths are relative to the repository root `/Users/matthewputnam/code/cadenza-native/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm baseline. No new dependencies and no config changes are required for this feature.

- [X] T001 Confirm `003-edit-view-nav` branch is checked out and `npm test` + `npx tsc --noEmit` are both clean against the current tree before any edits land.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the context, hooks, theme tokens, placeholder views, and Shell-level wiring that every user story depends on. Completing this phase gives the app a working `<EditViewBody>` showing the default `Setup` placeholder even before any header variant is implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Layout detection

- [X] T002 [P] Create `src/layout/breakpoints.ts` exporting `TABLET_MIN_WIDTH = 600` (logical pixels) with a one-line comment citing research.md §1.
- [X] T003 [P] Create `src/layout/useLayoutMode.ts` exporting `type LayoutMode = 'phone' | 'tablet'` and `function useLayoutMode(): LayoutMode` that reads `useWindowDimensions().width` and compares to `TABLET_MIN_WIDTH` using `>=` for `'tablet'`, per data-model.md §LayoutMode.

### Session state

- [X] T004 [P] Create `src/edit-view/EditViewContext.tsx` exporting `type EditView`, `EDIT_VIEWS`, `EDIT_VIEW_LABELS`, `EditViewContext`, `EditViewProvider` with default `editView = 'setup'`, `useMemo`-stable value, and NO AsyncStorage access, per data-model.md §EditViewContext.
- [X] T005 [P] Create `src/edit-view/useEditView.ts` exporting `useEditView()` that reads `EditViewContext` and throws a developer-facing error when used outside a provider, mirroring `src/mode/useMode.ts`.

### Theme additions

- [X] T006 [P] Extend `src/theme/colors.ts` with the new dark-theme tokens listed in contracts/ui-surfaces.md §5: `segmentedTrack`, `segmentedSelected`, `segmentedLabel`, `segmentedLabelSelected`, `menuSurface`, `menuDivider`, `menuItemPressed`. Pick concrete hex values and add an inline comment noting the WCAG AA contrast target for each foreground/background pair.

### Placeholder views

- [X] T007 [P] Create `src/app/SetupView.tsx` — a centered `Text` reading "Setup" on `colors.surface`; root `View` with `testID="view-setup"`.
- [X] T008 [P] Create `src/app/PatchesView.tsx` — same shape, label "Patches", `testID="view-patches"`.
- [X] T009 [P] Create `src/app/CuesView.tsx` — same shape, label "Cues", `testID="view-cues"`.
- [X] T010 Create `src/app/EditViewBody.tsx` that reads `useEditView()` and returns the matching placeholder (`SetupView` / `PatchesView` / `CuesView`). Depends on T004, T005, T007, T008, T009.

### Shell-level provider mount

- [X] T011 Update `src/app/Shell.tsx` to wrap the existing `mode === 'edit' ? <EditMode/> : <PerformMode/>` ternary in `<EditViewProvider>` so the provider sits ABOVE the mode switch (required for US3 preservation). Depends on T004.
- [X] T012 Update `src/app/EditMode.tsx` to replace the empty `<View style={styles.body} />` with `<EditViewBody />`. Leave the header untouched in this task; header changes come in US1/US2. Depends on T010, T011.

### Foundational tests

- [X] T013 [P] Create `__tests__/layout/useLayoutMode.test.tsx` asserting: width 599 → `'phone'`, width 600 → `'tablet'`, width 9999 → `'tablet'`, and that the hook re-evaluates when `useWindowDimensions` width changes. Use `jest.mock` on `react-native`'s `useWindowDimensions`. Depends on T003.
- [X] T014 [P] Create `__tests__/edit-view/EditViewContext.test.tsx` asserting: (a) default `editView === 'setup'`; (b) `setEditView('patches')` updates the consumer; (c) `setEditView` identity is stable across re-renders; (d) AsyncStorage is NOT called during provider mount/update (mock it and assert zero calls); (e) `useEditView()` outside a provider throws a developer-facing error. Depends on T004, T005.
- [X] T015 [P] Update `__tests__/app/EditMode.test.tsx` (existing) to add a case asserting the default body testID is `view-setup` after mount. Depends on T012. This test will still pass after US1/US2 add header tests.

**Checkpoint**: Foundation ready. Both tablet and phone users see a placeholder `Setup` body; the existing Edit header is still the feature-002 layout (Perform + activity + gear). User story implementation can now begin.

---

## Phase 3: User Story 1 — Tablet segmented view switcher (Priority: P1) 🎯 MVP

**Goal**: On a tablet-sized layout, a visible three-segment control immediately to the right of the `Perform` button lets the user switch among Setup, Patches, Cues sub-views. The standalone `Perform` button is unchanged.

**Independent Test**: Run the app on an iPad / Android tablet (or a simulator at ≥ 600 pt width). Verify the segmented control is visible to the right of `Perform`, that tapping a segment swaps the body, and that the `Perform` button still switches to Perform mode. Phone layouts continue to show the feature-002 header unchanged.

### Implementation for User Story 1

- [X] T016 [US1] Create `src/app/EditViewSegmented.tsx`:
  - Props: none (reads `useEditView()` internally).
  - Renders a `<View>` with `flexDirection: 'row'` and `testID="edit-view-segmented"`, `accessibilityRole="tablist"`.
  - Three `Pressable`s with `testID` `"edit-view-segment-setup"` / `"edit-view-segment-patches"` / `"edit-view-segment-cues"`, `accessibilityRole="tab"`, `accessibilityLabel` equal to the display label, `accessibilityState={{ selected: isActive }}`, `focusable={true}`, minimum 88 × 44 pt hit area, focus ring (2 pt border using `colors.focusRing`) applied on `onFocus` and cleared on `onBlur` — must not shift layout (use border on the outer box with matching unfocused transparent border as a baseline).
  - Label text size ≥ 14 pt so it remains legible at default system font size (SC-001).
  - Selected segment uses `colors.segmentedSelected` background and `colors.segmentedLabelSelected` text; unselected uses `colors.segmentedTrack` / `colors.segmentedLabel`.
  - `onPress` → `setEditView(segmentKey)`.
  - Depends on T004, T005, T006.

- [X] T017 [US1] Create `src/app/EditViewHeaderControl.tsx`:
  - Uses `useLayoutMode()`.
  - Returns `<EditViewSegmented />` when `'tablet'`; returns `null` when `'phone'` (US2 will extend the phone branch).
  - Depends on T003, T016.

- [X] T018 [US1] Update `src/app/EditMode.tsx` to render `<EditViewHeaderControl />` in the header immediately between the existing `Perform` `Pressable` and the `<MidiActivityDisplay />`. Do not change the phone layout yet (on phone `EditViewHeaderControl` returns `null`, so the header still looks like feature-002). Depends on T017.

### Tests for User Story 1

- [X] T019 [P] [US1] Create `__tests__/app/EditViewSegmented.test.tsx` asserting every row in contracts/ui-surfaces.md §4 "EditViewSegmented": three segments in order, tap dispatches `setEditView`, `accessibilityState.selected` tracks the active view, each segment has `focusable !== false` (keyboard reachability per Principle VII), and firing `onFocus` on a segment applies the focus-ring style (border color becomes `colors.focusRing`). Depends on T016.
- [X] T020 [US1] Update `__tests__/app/EditMode.test.tsx` to add a tablet-width case (mock `useWindowDimensions` to 800): assert `edit-view-segmented` is in the tree and the `Perform` button (`accessibilityLabel="Perform"`) is still present. Depends on T018.

**Checkpoint**: Tablet users can switch sub-views via the segmented control. Phone users see no change vs. feature 002. MVP shippable.

---

## Phase 4: User Story 2 — Phone View dropdown (Priority: P1)

**Goal**: On a phone-sized layout, replace the standalone `Perform` button with a `View` dropdown that exposes Setup, Patches, Cues, Perform as selectable options. The tablet variant built in US1 is unchanged.

**Independent Test**: Run the app at < 600 pt width. Verify the `View` button appears where `Perform` used to, that the `Perform` button is gone, and that the dropdown opens on tap, closes on backdrop or back gesture, dispatches `setEditView` for Setup/Patches/Cues, and dispatches `setMode('perform')` for Perform.

### Implementation for User Story 2

- [X] T021 [US2] Create `src/app/EditViewDropdown.tsx`:
  - Uses `useEditView()` and `useMode()` internally.
  - Anchor: a `Pressable` with `testID="edit-view-dropdown-button"`, `accessibilityRole="button"`, `accessibilityLabel="View"`, `accessibilityHint="Opens view menu"`, `focusable={true}`, 88 × 44 pt minimum, label is always the literal string "View" (per contracts/ui-surfaces.md §2 — the current sub-view is indicated inside the menu, never on the anchor). Anchor focus-ring: 2 pt border using `colors.focusRing` applied on `onFocus`, cleared on `onBlur`, non-layout-shifting (same approach as segments).
  - Capture anchor position on open using `anchorRef.current?.measureInWindow(...)`.
  - `<Modal transparent animationType="fade" visible={open} onRequestClose={close} supportedOrientations={['portrait','portrait-upside-down','landscape-left','landscape-right']}>`.
  - A full-surface `Pressable` with `testID="edit-view-menu-backdrop"` dismisses on tap with no state change.
  - Menu `<View>` with `testID="edit-view-dropdown-menu"`, `accessibilityRole="menu"`, `accessibilityViewIsModal={true}`, `backgroundColor: colors.menuSurface`, positioned from measured coords.
  - Four `Pressable` items in order with `testID` `"edit-view-menu-setup"` / `"edit-view-menu-patches"` / `"edit-view-menu-cues"` / `"edit-view-menu-perform"`, `accessibilityRole="menuitem"`, `focusable={true}`. Setup/Patches/Cues items carry `accessibilityState={{ selected: isActive }}` and render a leading `Ionicons name="checkmark"` when active. Perform has no `selected` state and no check. Each item applies a focus-ring style (`colors.focusRing` border) on `onFocus` so keyboard users can see the currently focused item against `colors.menuSurface`.
  - Rotation while the menu is open is not required to persist the menu — per research.md §3 and spec Edge Case, closing the menu on rotation is acceptable. No explicit rotation handler is required; the existing `Modal.supportedOrientations` covers layout and the user can reopen if the menu dismisses.
  - On item press:
    - Setup / Patches / Cues → `setEditView(key)`, then close.
    - Perform → `setMode('perform')`, then close. Does NOT call `setEditView`.
  - Depends on T004, T005, T006 (menu tokens).

- [X] T022 [US2] Extend `src/app/EditViewHeaderControl.tsx` so the `'phone'` branch returns `<EditViewDropdown />`. Depends on T017, T021.

- [X] T023 [US2] Update `src/app/EditMode.tsx` to omit the standalone `Perform` button when `useLayoutMode() === 'phone'`. On tablet the Perform button remains in place (unchanged from US1). Depends on T018, T022.

### Tests for User Story 2

- [X] T024 [P] [US2] Create `__tests__/app/EditViewDropdown.test.tsx` asserting every row in contracts/ui-surfaces.md §4 "EditViewDropdown": closed → menu not in tree; tap anchor opens menu; four items in order; tapping Setup/Patches/Cues calls `setEditView(key)` and closes; tapping Perform calls `setMode('perform')` and closes without calling `setEditView`; backdrop tap closes with no state change; `onRequestClose` closes the menu; `accessibilityState.selected` tracks active view for Setup/Patches/Cues and is falsy for Perform; anchor button and every menu item have `focusable !== false` (keyboard reachability per Principle VII); firing `onFocus` on the anchor and on each menu item applies the focus-ring style. Depends on T021.
- [X] T025 [US2] Update `__tests__/app/EditMode.test.tsx` to add a phone-width case (mock `useWindowDimensions` to 400): assert `edit-view-dropdown-button` is in the tree, the `Perform` button is NOT in the tree, the preferences gear (`accessibilityLabel="Preferences"`) IS in the tree, `MidiActivityDisplay`'s testID is in the tree, and `view-setup` is the body's testID. (Preferences + activity presence on phone covers FR-010.) Depends on T023.

**Checkpoint**: Phone users have the View dropdown. Tablet users still have the segmented control. The full two-variant feature is live.

---

## Phase 5: User Story 3 — Session preservation across mode switches (Priority: P2)

**Goal**: Demonstrate that the sub-view selection survives an Edit → Perform → Edit round-trip within a single session, and resets to `Setup` on cold launch.

**Independent Test**: Set `editView='patches'`, switch to Perform mode, switch back to Edit, observe that Patches is still the active sub-view. After a cold launch, observe that the body defaults to Setup.

**Note**: The architectural implementation for US3 was completed in Foundational (T011) by mounting `EditViewProvider` above the Shell-level mode switch. This phase adds the behavioral test that proves the preservation holds.

### Tests for User Story 3

- [X] T026 [US3] Update `__tests__/app/Shell.test.tsx` (existing) to add a test: render `<Shell>` inside `<ModeProvider><EditViewProvider>…`, set editView to `'patches'` via the context setter, switch mode to `'perform'`, switch back to `'edit'`, assert that the body testID is still `view-patches`. Depends on T011, T012.

**Checkpoint**: All three user stories are covered. The feature is functionally and behaviorally complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Analysis-driven test hardening, manual QA, contrast verification, and repo health.

### Automated hardening (from /speckit.analyze findings)

- [X] T034 [P] Create `__tests__/app/LayoutSwap.test.tsx` covering FR-012: render `<Shell>` with an `EditMode` path, mock `useWindowDimensions` to 800 → assert `edit-view-segmented` in tree; call `setEditView('patches')` via the context; change mock to 400 → assert (a) `edit-view-dropdown-button` is in tree and `edit-view-segmented` is not, (b) `view-patches` is still the body testID, (c) the `Perform` button is not in the tree. Return mock to 800 → assert segmented control reappears and Patches is still selected. Depends on T023, T025, T026.
- [X] T035 [P] Create `__tests__/app/MinWidth.test.tsx` covering SC-005: render `<EditMode>` with `useWindowDimensions` mocked to 320 (iPhone SE portrait, smallest supported). Assert all three header children are present with non-zero rendered dimensions via `toJSON()` layout inspection: `edit-view-dropdown-button`, `MidiActivityDisplay`'s testID, and the preferences gear (`accessibilityLabel="Preferences"`). No assertion is a hard layout test — it proves each element is still mounted and reachable; truncation is caught by manual QA (T028/T030). Depends on T023.

### Manual QA (per-device quickstart walkthrough)

- [ ] T027 Run the full quickstart.md walkthrough (US1 + US2 + US3 + every edge-case section) on an iPad (or iPad simulator) and record any deviations in this task's notes; fix any spec drift before merge. Depends on T025, T026.
- [ ] T028 Run the same quickstart.md walkthrough on an iPhone (or iPhone simulator). Depends on T025, T026.
- [ ] T029 Run the same quickstart.md walkthrough on an Android tablet emulator. Depends on T025, T026.
- [ ] T030 Run the same quickstart.md walkthrough on an Android phone emulator. Depends on T025, T026.
- [ ] T031 [P] Verify WCAG AA contrast for each foreground/background pair in contracts/ui-surfaces.md §5. Use an accessibility inspector (iOS Accessibility Inspector, Android Accessibility Scanner, or an online contrast checker) against the hex values chosen in T006. If any pair fails, update the color token and re-test. Depends on T006.
- [X] T032 [P] Run `npm test` and confirm all suites are green (existing feature-001 and feature-002 tests MUST continue to pass).
- [X] T033 [P] Run `npx tsc --noEmit` and confirm no TypeScript errors across the whole project.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; run immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories. T010, T011, T012 are the integration points; the leaf tasks (T002–T009) can all run in parallel once Setup is done.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational. Can run in parallel with User Story 1 if two developers are available — T021 is independent of T016, though T022 and T023 depend on the US1 versions of `EditViewHeaderControl` and `EditMode.tsx` and will need merge coordination.
- **User Story 3 (Phase 5)**: Depends on Foundational (T011, T012). T026 can be written immediately after Phase 2 completes; does not require US1 or US2 to be done.
- **Polish (Phase 6)**: T034 and T035 (automated hardening) require US1 + US2 to be complete and should run before the manual QA tasks so failures are caught early. T027–T030 (manual QA) then require US1 + US2 + US3 to be complete. T031–T033 can run once the tokens exist (T006) and anytime the source tree compiles.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2. No dependency on US2 or US3.
- **US2 (P1)**: Can start after Phase 2. Shares two files with US1 (`EditViewHeaderControl.tsx`, `EditMode.tsx`) — sequence the edits or land US1 first to avoid a merge churn.
- **US3 (P2)**: Only adds a test; the implementation is in Foundational. Can start immediately after Phase 2.

### Within Each User Story

- Implementation first (new component), then header-control wiring, then `EditMode.tsx` update, then tests.
- Tests can be drafted before their implementation exists (the contracts file pins behavior) but will only run green after the implementation lands — that's fine; we're not doing strict TDD here because Principle IV exempts UI chrome.

### Parallel Opportunities

- Phase 2: T002, T003, T004, T005, T006, T007, T008, T009 all touch different files and can run in parallel. T010, T011, T012 are sequenced on top.
- Phase 2 tests: T013, T014 run in parallel with each other; T015 runs in parallel with both once T012 exists.
- Phase 3 test T019 can be written in parallel with T016 implementation.
- Phase 4 test T024 can be written in parallel with T021 implementation.
- Phase 6 T031, T032, T033, T034, T035 run in parallel (different files, independent assertions).

---

## Parallel Example: Phase 2 Foundational

```bash
# All independent leaf tasks — different files, no cross-dependencies.
Task: "Create src/layout/breakpoints.ts"                                        # T002
Task: "Create src/layout/useLayoutMode.ts"                                      # T003
Task: "Create src/edit-view/EditViewContext.tsx"                                # T004
Task: "Create src/edit-view/useEditView.ts"                                     # T005
Task: "Extend src/theme/colors.ts with 7 new tokens"                            # T006
Task: "Create src/app/SetupView.tsx"                                            # T007
Task: "Create src/app/PatchesView.tsx"                                          # T008
Task: "Create src/app/CuesView.tsx"                                             # T009

# Then sequentially:
# T010 EditViewBody (needs placeholders + hooks)
# T011 Shell wrap      (needs EditViewProvider)
# T012 EditMode body  (needs EditViewBody + Shell mount)
# T013, T014, T015 tests in parallel
```

---

## Implementation Strategy

### MVP scope

**MVP = Phase 1 + Phase 2 + Phase 3 (US1).**

With just the tablet segmented control, tablet users get the full new navigation experience. Phone users see no regression — the Edit header remains exactly as feature 002 left it, and the body now shows the `Setup` placeholder instead of being blank. That is a shippable increment on its own.

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T015).
3. Complete Phase 3: User Story 1 (T016–T020).
4. **STOP and VALIDATE**: run quickstart.md §"US1" on a tablet; confirm all acceptance scenarios pass; ship.

### Incremental delivery

- **Increment 1 (MVP)**: Phases 1 + 2 + 3. Tablet users get the feature.
- **Increment 2**: Add Phase 4 (US2). Phone users get the feature.
- **Increment 3**: Add Phase 5 (US3). The preservation test locks the contract. Technically already working after Phase 2, but the explicit regression test should land before any refactor touches `Shell.tsx` or `EditViewProvider`.
- **Increment 4 (pre-merge)**: Phase 6 polish — full multi-device QA, contrast verification, suite-green confirmation.

### Parallel team strategy

With two developers after Phase 2 completes:

- **Developer A** takes US1 (T016–T020).
- **Developer B** takes US2 (T021–T025). Coordinates with A on `EditViewHeaderControl.tsx` and `EditMode.tsx` (sequential edits or a shared PR).
- **Either developer** picks up US3 (T026) — tiny.

Then one developer runs Phase 6 on all four target devices.

---

## Notes

- [P] tasks = different files, no dependencies — safe to execute in parallel.
- [Story] label ties each task to a user story for traceability; Setup, Foundational, and Polish tasks have no story label by design.
- Per Principle IV, behavioral tests for UI chrome are **optional**. We include them because the harness exists; they should pass, not be skipped. Do not write tests that cannot be made to pass — flake is a regression.
- Commit after each task or per logical group. Small commits make the pre-merge review easier.
- Do not introduce new npm dependencies in any task — the feature is explicitly scoped to existing libraries.
- Do not persist `editView` to AsyncStorage in any task — session-scoped state is the contract (data-model.md §Provider invariants #3).
- Stop at any checkpoint to validate the story independently on-device before proceeding.
