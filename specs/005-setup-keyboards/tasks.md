---

description: "Task list for Setup Tab — Keyboard Configuration"
---

# Tasks: Setup Tab — Keyboard Configuration

**Input**: Design documents from `/specs/005-setup-keyboards/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/ui-surfaces.md, quickstart.md

**Tests**: Included — UI chrome is exempt from Principle IV's test-first requirement, but the pure helpers (`sizeToRange`, `detectConflicts`), storage, CRUD context, Dropdown component, and SetupView contract are cheap to test against the existing Jest harness and protect downstream consumer features (Patches / Cues / routing).

**Organization**: Tasks are grouped by user story. User stories map to priorities from `spec.md`:

- **US1** — Single keyboard: change the keyboard's size (P1)
- **US2** — Multiple keyboards: differentiate by device and channel (P1)
- **US3** — Persisted device is not currently connected (P2)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single-project mobile-app layout per plan.md. All paths are relative to the repository root `/Users/matthewputnam/code/cadenza-native/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm clean baseline. No dependency or config changes for this feature.

- [X] T001 Confirm `005-setup-keyboards` branch is checked out and `npm test` + `npx tsc --noEmit` are both clean against the current tree before any edits land.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create types, pure helpers, storage, the persisted context, the app-level provider mount, the generic `<Dropdown />` component, and tests for all of the above. Every user story depends on this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Types and pure helpers

- [X] T002 [P] Create `src/keyboards/types.ts` exporting `KeyboardSize`, `KEYBOARD_SIZES` (frozen tuple), `KeyboardRange`, `Keyboard`, and `StoredSetup` per data-model.md §KeyboardSize, §Keyboard, §Keyboards.
- [X] T003 [P] Create `src/keyboards/schema.ts` exporting `sizeToRange(size)` returning the fixed MIDI low/high table from data-model.md §Size → MIDI range mapping, plus `newDefaultKeyboard()` (factory that returns a single 88-key Keyboard with a freshly-generated id and all other fields null), plus `displayName(keyboard, position)` returning `keyboard.nickname` when it is a non-empty string, else `"Keyboard ${position + 1}"`. Use `crypto.randomUUID()` with a testable fallback when unavailable.
- [X] T004 [P] Create `src/keyboards/conflicts.ts` exporting `detectConflicts(keyboards): Set<string>` per research.md §4. Pure, O(N) Map-bucketed.

### Storage

- [X] T005 [P] Create `src/keyboards/storage.ts` exporting `STORAGE_KEY = 'cadenza.keyboards.v1'`, `loadKeyboards()` returning `readonly Keyboard[] | null` (null on miss OR parse error, logged with `console.warn`), and `saveKeyboards(keyboards)` that JSON-stringifies `{ version: 1, keyboards }` and swallows write errors. Mirror the shape of `src/prefs/storage.ts`.

### Theme

- [X] T006 [P] Extend `src/theme/colors.ts` with a single new token `warning: '#F59E0B'` per contracts/ui-surfaces.md §7, with an inline comment documenting WCAG AA contrast targets against `surface` and `surfaceElevated`. Final hex may adjust in T032 if contrast fails.

### Context + hook

- [X] T007 Create `src/keyboards/KeyboardsContext.tsx` exporting `KeyboardsContext`, `KeyboardsProvider`, and the `KeyboardsContextValue` interface per data-model.md §KeyboardsContext. Responsibilities:
  - On mount, call `loadKeyboards()`; on null, synthesise `[newDefaultKeyboard()]` (do NOT save synthesised default on first mount — see research.md §3).
  - `isLoaded` starts `false`, flips `true` after the initial load resolves either path.
  - `add()`, `update(id, patch)`, `remove(id)` behave per §Provider invariants. `remove` is a no-op when length is 1.
  - `update` contains the **channel auto-default logic** (research.md §6): when the patch changes `deviceName` to a value that becomes shared with at least one other Keyboard and the current Keyboard's channel is `null`, set `channel` to the lowest integer in `[1, 16]` not yet used by any sibling on that device in the same update. When the new `deviceName` is unique across keyboards, leave `channel` untouched (null stays null).
  - After every mutation, call `saveKeyboards` asynchronously; swallow errors.
  - `useMemo`-stable value; CRUD function identities don't churn across renders.
  - Depends on T002, T003, T004, T005.
- [X] T008 [P] Create `src/keyboards/useKeyboards.ts` exporting a `useKeyboards()` hook that reads `KeyboardsContext` and throws `'useKeyboards must be used within a <KeyboardsProvider>.'` when called outside the provider. Depends on T007.

### App-level provider mount

- [X] T009 Update `/Users/matthewputnam/code/cadenza-native/App.tsx` to mount `<KeyboardsProvider>` between `<ModeProvider>` and `<Shell/>`. Depends on T007.

### Generic Dropdown

- [X] T010 [P] Create `src/keyboards/Dropdown.tsx` implementing the generic `<Dropdown<T> />` component per contracts/ui-surfaces.md §5:
  - Props `{ value, options, onChange, placeholder?, testID?, accessibilityLabel, disabled?, trailingIcon? }`.
  - Anchor: `<Pressable testID={testID} accessibilityRole="button" accessibilityLabel={…} focusable>`; pressed-state visual; focus ring via `colors.focusRing` on `onFocus` (non-layout-shifting border approach from feature 003).
  - Trailing icon slot (defaults to `Ionicons name="chevron-down"` if none passed).
  - Tap opens a `<Modal transparent animationType="fade" supportedOrientations={[…all four…]} onRequestClose={close}>`.
  - Full-surface `<Pressable testID={`${testID}-menu-backdrop`}>` backdrop that dismisses on tap.
  - Menu `<View testID={`${testID}-menu`} accessibilityRole="menu">` with each option as a `<Pressable testID={`${testID}-option-${option.value}`} accessibilityRole="menuitem" accessibilityState={{ selected }} focusable>`.
  - `disabled={true}` renders the anchor with muted style and no tap target. Depends on nothing specific beyond `src/theme/colors.ts`.

### Foundational tests

- [X] T011 [P] Create `__tests__/keyboards/schema.test.ts` asserting every contract row in contracts/ui-surfaces.md §6 "schema.ts": `KEYBOARD_SIZES` content + order, `sizeToRange` table for all 7 sizes, `high - low + 1 === size`, and that every `low`/`high` is a white key (use `isWhiteKey` from `src/keyboard/notes`). Also assert `newDefaultKeyboard()` returns 88-key with all other fields null and unique ids across multiple calls. Also assert `displayName(kb, 0)` returns `"Keyboard 1"` when `nickname` is null or `""`, and returns `kb.nickname` verbatim when non-empty. Depends on T003.
- [X] T012 [P] Create `__tests__/keyboards/conflicts.test.ts` asserting every contract row in §6 "conflicts.ts": empty, single, two-same, two-diff-channels, three-way conflict, null device, null channel. Depends on T004.
- [X] T013 [P] Create `__tests__/keyboards/storage.test.ts` asserting every contract row in §6 "storage.ts": miss returns null, parse error returns null with a `console.warn`, save→load round-trip, write error is swallowed. Additionally assert the **name-not-ID** invariant (FR-013): after saving a Keyboard whose `deviceName` is set, the persisted JSON contains the `deviceName` string but NO `deviceId`, no `vendorId`, and no device-identifier fields on the Keyboard object. Use the existing `@react-native-async-storage/async-storage` jest mock. Depends on T005.
- [X] T014 [P] Create `__tests__/keyboards/KeyboardsContext.test.tsx` asserting every contract row in §6 "KeyboardsContext.tsx": default state, `isLoaded` flip, `add`/`update`/`remove`, last-delete no-op, save-after-mutation, miss→default (without first-mount save), parse-error→default, consumer-outside-provider throws, AND the channel auto-default behavior when a Keyboard's device becomes shared. Depends on T007, T008.
- [X] T015 [P] Create `__tests__/keyboards/Dropdown.test.tsx` asserting every contract row in §6 "Dropdown.tsx": closed default, tap opens, option selection, backdrop dismiss, `onRequestClose` dismiss, accessibility state, `focusable`, focus-ring on focus, disabled blocks open. Depends on T010.

**Checkpoint**: Foundation ready. Types, pure logic, storage, context, hook, provider mount, theme token, and Dropdown primitive all exist and are tested. The app builds and runs; the Setup tab still shows the feature-003 placeholder until Phase 3 lands.

---

## Phase 3: User Story 1 — Single keyboard size change (Priority: P1) 🎯 MVP

**Goal**: A first-launch user sees one 88-key keyboard in the Setup tab and can change its size via a dropdown. Tablet shows the `<Keyboard>` component; phone shows a card without it.

**Independent Test**: Cold launch, open Setup, change size on the single keyboard, relaunch, verify size persists. Verify tablet shows the `<Keyboard>` visualization at the matching MIDI range and phone does not. Device, channel, nickname, and delete controls are NOT visible.

### Implementation for User Story 1

- [X] T016 [US1] Create `src/keyboards/KeyboardControls.tsx` implementing the shared controls component per contracts/ui-surfaces.md §4:
  - Props per the `KeyboardControlsProps` signature (keyboard, position, isOnlyKeyboard, devices, isInConflict, sharedDeviceSiblings, onChange, onDelete, layout).
  - Size dropdown: always visible; `testID="setup-keyboard-${keyboard.id}-size"`; options are `KEYBOARD_SIZES.map(s => ({ value: s, label: `${s} keys` }))`; `onChange` wires to `props.onChange({ size: newSize })`.
  - Device / channel / nickname / delete controls: ALL hidden in this task (they'll land in US2). `isOnlyKeyboard === true` is effectively the only branch exercised here.
  - Layout prop affects internal arrangement (row vs. stacked) but this task's only-size case is the same either way.
  - Depends on T002, T003, T010.

- [X] T017 [US1] Create `src/keyboards/KeyboardRow.tsx` (tablet wrapper) per contracts/ui-surfaces.md §2:
  - Renders a `<View testID={`setup-keyboard-${kb.id}`}>` containing `<KeyboardControls .../>` on top and a `<View testID={`setup-keyboard-${kb.id}-visual`}><Keyboard low={range.low} high={range.high} highlighted={[]} /></View>` below.
  - Range comes from `sizeToRange(kb.size)`.
  - Depends on T016; consumes `<Keyboard>` from `src/keyboard/Keyboard.tsx` (feature 004).

- [X] T018 [US1] Create `src/keyboards/KeyboardCard.tsx` (phone wrapper) per contracts/ui-surfaces.md §3:
  - Renders a `<View testID={`setup-keyboard-${kb.id}`}>` with card styling (rounded corners, `colors.surfaceElevated` background, `colors.border` hairline border) containing `<KeyboardControls .../>` only. NO `<Keyboard>` visualization.
  - Depends on T016.

- [X] T019 [US1] Update `src/app/SetupView.tsx` to replace the placeholder (feature 003) with the real implementation per contracts/ui-surfaces.md §1:
  - Consume `useKeyboards()`, `useLayoutMode()`, `useMidiInput()` (devices may be unused in US1; it's imported here so US2 can use it without restructuring).
  - When `!isLoaded`, render an empty `<ScrollView testID="setup-view" />` (no spinner).
  - When loaded, map each `keyboards` entry to `<KeyboardRow>` (tablet) or `<KeyboardCard>` (phone). The Add Keyboard button is NOT rendered in this task (lands in US2 — T024).
  - Pass `position`, `isOnlyKeyboard = (keyboards.length === 1)`, `layout`, `devices = midiInput.devices`, `isInConflict = false` (wired in US2), `sharedDeviceSiblings = []` (wired in US2), and wire `onChange`/`onDelete` through to `useKeyboards().update`/`remove`.
  - Depends on T008, T016, T017, T018.

### Tests for User Story 1

- [X] T020 [P] [US1] Create `__tests__/keyboards/SetupView.test.tsx` asserting the US1 subset of contracts/ui-surfaces.md §6 "SetupView.tsx":
  - First-launch renders one Keyboard with size dropdown ONLY.
  - Tablet width (800) renders `<Keyboard>` testID for the keyboard; phone width (400) does not.
  - Size dropdown options are the 7 standard sizes.
  - Selecting a new size updates the context AND persists via AsyncStorage.
  - Depends on T019.

**Checkpoint**: Single-keyboard size-change works end-to-end. Tablet and phone layouts both correct. MVP shippable.

---

## Phase 4: User Story 2 — Multiple keyboards with device / channel / nickname (Priority: P1)

**Goal**: A user can add multiple keyboards, each assigned to a named device (with a MIDI channel when two share a device), with an optional nickname and a delete action. Conflicts are flagged but not blocked.

**Independent Test**: Add a second keyboard, assign each to a device, give each a nickname, verify channel dropdown appears when both share a device, verify conflict warning on both when they also share a channel. Verify all state persists across cold launches. Verify delete returns the remaining keyboard to the single-keyboard layout.

### Implementation for User Story 2

- [X] T021 [US2] Extend `src/keyboards/KeyboardControls.tsx` to render the full controls set per contracts/ui-surfaces.md §4 "Conditional visibility" table:
  - **Display-name heading**: render when `!isOnlyKeyboard`. A `<Text testID="setup-keyboard-${id}-name">` above the controls row/stack, content = `displayName(keyboard, position)` from `src/keyboards/schema.ts`. Renders the user's nickname when set, else the default `"Keyboard N"` label. Uses `colors.textPrimary` at ~16 pt, `fontWeight: '600'`.
  - Device dropdown: render when `!isOnlyKeyboard`. Option list is the set of currently-connected devices' names (deduplicated, sorted alphabetically). When the Keyboard's persisted `deviceName` is not in the live list AND is non-null, include it as an additional option (US3 adds a warning icon; for US2 just include it without decoration). Selected value is `keyboard.deviceName`. `onChange` wires to `props.onChange({ deviceName: newName })`. testID `setup-keyboard-${id}-device`. **Empty-state placeholder (FR-007)**: when the resolved option list is empty (i.e., no devices are connected AND `keyboard.deviceName` is null), render the anchor in `disabled={true}` state displaying the literal text `"<No input detected>"`. Tapping the anchor must NOT open a menu; no entry is selectable; no `onChange` fires.
  - Channel dropdown: render when `!isOnlyKeyboard` AND `sharedDeviceSiblings.length >= 1`. Options are 1..16. Selected value is `keyboard.channel`. testID `setup-keyboard-${id}-channel`.
  - Nickname `<TextInput>`: render when `!isOnlyKeyboard`. testID `setup-keyboard-${id}-nickname`. `maxLength={32}`, `multiline={false}` (single line; newlines are not accepted by a default `<TextInput>`). Empty string written as `null` via `onChange({ nickname: next || null })`. Placeholder text is `displayName(keyboard, position)` so the user sees the default label in-field when the nickname is empty. `accessibilityLabel="Nickname"`, `accessibilityHint="Optional display name for this keyboard"`.
  - Delete button: render when `!isOnlyKeyboard`. testID `setup-keyboard-${id}-delete`. `accessibilityLabel="Delete Keyboard"`. On press calls `props.onDelete()`.
  - Depends on T016.

- [X] T022 [US2] Update `src/keyboards/KeyboardRow.tsx` and `src/keyboards/KeyboardCard.tsx` to render a conflict-warning banner when `isInConflict === true`, positioned per contracts/ui-surfaces.md §§2–3. testID `setup-keyboard-${id}-conflict-warning`. Banner content: an `Ionicons name="warning" color={colors.warning}` glyph followed by the text "Channel conflict: two keyboards on the same device and channel.". `accessibilityRole="alert"`. Depends on T017, T018, T006.

- [X] T023 [US2] Update `src/app/SetupView.tsx` to add the `+ Add Keyboard` button at the bottom of the ScrollView content per contracts/ui-surfaces.md §1. testID `setup-add-keyboard`. `accessibilityLabel="Add Keyboard"`. On press calls `useKeyboards().add()`. Also update the per-keyboard mapping to pass the real `isInConflict` (from `detectConflicts(keyboards).has(kb.id)`) and `sharedDeviceSiblings` (keyboards other than this one where `deviceName === kb.deviceName && kb.deviceName != null`). Depends on T019, T021, T022.

- [X] T024 [P] [US2] Extend `__tests__/keyboards/KeyboardsContext.test.tsx` with channel-auto-default regression tests: when `update(id, { deviceName: X })` creates a newly-shared device AND `keyboard.channel === null`, the update computes the lowest unused channel in `[1, 16]` among the Keyboards whose `deviceName === X`. Cover: fresh share → 1, sibling on 1 → 2, siblings on 1–15 → 16, siblings on 1–16 → stays null (saturated-channels edge case per data-model §Keyboard invariant 4). No production-code change expected — T007 already owns the logic. Depends on T007, T014.

### Tests for User Story 2

- [X] T025 [US2] Extend `__tests__/keyboards/SetupView.test.tsx` with the US2 cases:
  - After `add()`: second Keyboard appears; display-name heading, device, nickname, delete visible on BOTH.
  - Display-name heading defaults to `"Keyboard 1"` / `"Keyboard 2"` when nickname is null; updates to the typed nickname when the TextInput's value is non-empty; reverts to `"Keyboard N"` when cleared to empty string.
  - Both keyboards on different devices: no channel dropdown.
  - Both keyboards on the same device: channel dropdowns visible on both with auto-defaulted values.
  - Both keyboards on same device + same channel: `setup-keyboard-<id>-conflict-warning` visible on BOTH.
  - Resolving the conflict (changing one channel) clears the warning on both within the next render.
  - **Empty-device-list placeholder (FR-007)**: with `useMidiInput().devices === []` and both Keyboards' `deviceName === null`, the device dropdown anchor displays `"<No input detected>"` and is disabled (tap does not open a menu; no `onChange` fires).
  - **Live device update (FR-017)**: mount with `useMidiInput().devices === []`, then rerender with `devices` containing one entry; assert the device dropdown now offers that device as a selectable option.
  - **Layout swap mid-edit (FR-016)**: in the multi-keyboard state with a half-typed nickname and a specific size selected, mock `useWindowDimensions` 800 → 400 → 800; assert the Keyboards list and the current nickname text both survive, and the header variant swaps from KeyboardRow to KeyboardCard and back.
  - Delete: removing a keyboard returns the list to length 1 and removes the now-hidden controls from the surviving Keyboard's row.
  - Depends on T023.

**Checkpoint**: Full multi-keyboard workflow works. All mutations persist. Conflicts visibly flagged.

---

## Phase 5: User Story 3 — Disconnected device warnings (Priority: P2)

**Goal**: When a Keyboard's assigned device is not currently connected, the UI preserves the assignment and flags it clearly with a warning icon on the device dropdown.

**Independent Test**: Assign a Keyboard to a connected device, then disconnect the device (or remove its name from the live devices list in a test). Verify the device dropdown anchor shows the warning icon and the stored device is still in the dropdown's option list. Reconnect (or re-add to the list) and verify the warning clears.

### Implementation for User Story 3

- [X] T026 [US3] Update the device dropdown in `src/keyboards/KeyboardControls.tsx` to surface the warning state:
  - When `keyboard.deviceName != null` AND no device in `devices` has `name === keyboard.deviceName`, pass `trailingIcon={<Ionicons name="warning" color={colors.warning} />}` to the `<Dropdown>` anchor. Otherwise pass `undefined` (let the default chevron render).
  - When constructing the option list, for the stored-but-disconnected case, attach the same warning icon as the option's `trailingIcon` so the option visually matches the anchor state.
  - The anchor's `accessibilityLabel` when disconnected is `"Device, ${keyboard.deviceName}, disconnected"` (not just `"Device"`). When connected/no-device, it's the base label.
  - Expose a `testID="setup-keyboard-${id}-device-warning"` on the anchor's warning icon View so tests can query it.
  - Depends on T021.

### Tests for User Story 3

- [X] T027 [US3] Extend `__tests__/keyboards/SetupView.test.tsx` with the US3 cases:
  - A Keyboard whose `deviceName` is not in the `devices` list renders `setup-keyboard-<id>-device-warning`.
  - The same Keyboard, after `devices` is updated to include its name, no longer renders the warning icon.
  - Open the device dropdown via `fireEvent.press` on the anchor; the stored-but-disconnected device appears in the option list (testID `setup-keyboard-<id>-device-option-<disconnected-name>`).
  - Depends on T026.

**Checkpoint**: All three user stories land end-to-end. Device reconnection is automatic.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Repo-health checks, contrast verification, and per-device manual QA.

### Automated checks

- [X] T028 [P] Run `npm test` and confirm all suites are green — existing tests from features 001–004 AND the new keyboards tests MUST pass.
- [X] T029 [P] Run `npx tsc --noEmit` and confirm no TypeScript errors across the whole project.
- [X] T030 [P] Verify WCAG AA contrast for the new `warning` token against `surface` (#0B0B0D) and `surfaceElevated` (#151518). Both pairings MUST reach at least 3:1. If either fails, adjust the `warning` hex and re-run. Document the final ratios in a comment next to the token.

### Manual QA (per quickstart.md)

- [X] T031 Run the full quickstart.md walkthrough (US1 + US2 + US3 + every edge-case and accessibility section) on an iPad (or iPad simulator). Record deviations here; fix before merge. Depends on T027, T028, T029, T030.
- [X] T032 Run the same quickstart.md walkthrough on an iPhone (or iPhone simulator). Depends on T031 setup.
- [X] T033 Run the same quickstart.md walkthrough on an Android tablet emulator. Depends on T031 setup.
- [X] T034 Run the same quickstart.md walkthrough on an Android phone emulator. Depends on T031 setup.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; run immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS user stories. Most leaf tasks are parallelizable; T007/T009 are the serial integration points.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational AND on US1 (T021 builds on T016).
- **User Story 3 (Phase 5)**: Depends on US2 (T026 modifies the device dropdown introduced in T021).
- **Polish (Phase 6)**: T028–T030 can run once the tree compiles; T031–T034 need all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Standalone after Phase 2. MVP.
- **US2 (P1)**: Extends US1's KeyboardControls and SetupView. Landing in the same branch is recommended; US1 + US2 together are the "real" shippable unit.
- **US3 (P2)**: Extends US2's device dropdown. Tiny implementation, larger in test value.

### Within Each User Story

- Implementation first (new files / updates), then tests.
- Tests can be drafted in parallel with implementation once the contracts are clear; they only run green after implementation lands. Principle IV does not require strict TDD on this surface.

### Parallel Opportunities

- Phase 2 leaves most files independent:
  - T002, T003, T004, T005, T006, T010 — different files, all parallelizable.
  - T007 depends on T002/T003/T004/T005; T009 depends on T007.
  - T011, T012, T013 parallel once targets exist; T014, T015 parallel once T007/T010 exist.
- Phase 3: T016 is serial; T017 and T018 can parallel each other after T016; T019 waits on T017+T018; T020 can be drafted in parallel with T019.
- Phase 4: T021 is serial; T022 and T024 can parallel after T021; T023 waits on T019+T021+T022; T025 parallel with T023.
- Phase 6 T028, T029, T030 all run in parallel.

---

## Parallel Example: Phase 2 Foundational

```bash
# Independent leaf tasks — different files, no cross-dependencies.
Task: "Create src/keyboards/types.ts"              # T002
Task: "Create src/keyboards/schema.ts"             # T003
Task: "Create src/keyboards/conflicts.ts"          # T004
Task: "Create src/keyboards/storage.ts"            # T005
Task: "Extend src/theme/colors.ts with warning token"  # T006
Task: "Create src/keyboards/Dropdown.tsx"          # T010

# Then sequentially:
# T007 KeyboardsContext (needs types/schema/conflicts/storage)
# T008 useKeyboards (needs T007)
# T009 App.tsx mount (needs T007)

# Tests in parallel once their targets exist:
Task: "Create __tests__/keyboards/schema.test.ts"           # T011
Task: "Create __tests__/keyboards/conflicts.test.ts"        # T012
Task: "Create __tests__/keyboards/storage.test.ts"          # T013
Task: "Create __tests__/keyboards/KeyboardsContext.test.tsx" # T014
Task: "Create __tests__/keyboards/Dropdown.test.tsx"        # T015
```

---

## Implementation Strategy

### MVP scope

**MVP = Phases 1 + 2 + 3 (US1 only).**

The Setup tab becomes functional for the vast majority of first-time users (who have one keyboard). Size dropdown works, persists, and renders correctly on both tablet and phone. Multi-keyboard workflows are absent but not regressed — the Setup tab simply doesn't expose them yet.

1. Complete Phase 1: Setup (T001).
2. Complete Phase 2: Foundational (T002–T015).
3. Complete Phase 3: US1 (T016–T020).
4. **STOP and VALIDATE**: run the US1 sections of quickstart.md; confirm persistence; ship or hold.

### Incremental delivery

- **Increment 1 (MVP)**: Phases 1 + 2 + 3. Single-keyboard size change shipped.
- **Increment 2**: Phase 4 (US2). Multi-keyboard + device + channel + nickname + conflicts.
- **Increment 3**: Phase 5 (US3). Disconnected-device warnings.
- **Increment 4 (pre-merge)**: Phase 6. Automated checks + multi-device QA + contrast verification.

### Parallel team strategy

With two developers after Phase 2 completes:

- **Developer A** takes US1 (T016–T020). Lands the skeleton + single-keyboard path first.
- **Developer B** takes US2 building on top (T021–T025). Coordinates on `KeyboardControls` and `SetupView`.
- Either developer picks up US3 (T026, T027) — small.
- Polish (T028–T034) last.

---

## Notes

- [P] tasks = different files, no dependencies — safe to execute in parallel.
- [Story] label ties each task to a user story for traceability; Setup, Foundational, and Polish have no story label by design.
- Per Principle IV, behavioral tests for UI chrome are **optional**. We include them because the harness exists and downstream consumers (Patches / Cues) will rely on this data.
- Do not introduce new npm dependencies.
- Do not modify `src/midi/MidiInputContext.tsx` — the MIDI subsystem already exposes `devices: readonly MidiDevice[]` which is all this feature consumes.
- Do not implement runtime MIDI routing based on Keyboards configuration — that's a follow-on feature (out of scope per spec §Assumptions).
- Commit after each task or per logical group. Smaller commits make pre-merge review easier.
- Stop at any checkpoint to validate the story independently on-device before proceeding.
