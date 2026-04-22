# Research: Setup Tab — Keyboard Configuration

**Feature**: `005-setup-keyboards`
**Date**: 2026-04-22

Each section below captures one design decision, the reasoning, and the alternatives considered. Technical Context in `plan.md` has no NEEDS CLARIFICATION markers — these entries lock in the choices the plan depends on.

---

## 1. Persistence — reuse the preferences pattern

### Decision

Mirror the `src/prefs/` pattern from feature 002:

- `src/keyboards/storage.ts` exports `loadKeyboards()` and `saveKeyboards(keyboards)`, both failure-safe.
- `src/keyboards/KeyboardsContext.tsx` is a React context provider that runs `loadKeyboards()` once on mount; on read miss or parse error falls back to the default single-88-keyboard state; subsequent CRUD calls update in-memory state synchronously and fire an async `saveKeyboards(...)` that swallows its own errors.
- `AsyncStorage` key: `cadenza.keyboards.v1`.

### Rationale

Feature 002 already proved out this pattern and has tests for all failure paths. Copying it means:

- No new dependencies (AsyncStorage is already in `package.json`).
- No new failure modes that haven't been handled before — same three failure classes (missing / corrupt / unwritable) and same graceful fallbacks.
- Consistent mental model for the codebase: "preferences are small flat persistence; keyboards are a list but persist the same way."

### Alternatives considered

- **MMKV / secure store**: rejected. Bigger dependency for no functional win on a small JSON blob. Not needed at Cadenza's current scope.
- **Per-keyboard storage keys** (one key per keyboard): rejected. Makes atomic "replace the whole list" operations (including removing a keyboard) ugly and race-prone. A single JSON blob is atomic.
- **Versioned schema with migrations**: deferred. The `v1` suffix in the key leaves headroom for a migration when needed; none is needed today.

---

## 2. Device identification — name, not ID

### Decision

Persist only the device's display `name` (e.g., `"Roland A-49"`). At resolve time, match a Keyboard's `deviceName` against the currently-connected `useMidiInput().devices.name` list. If no current device matches, the assignment is "stored but disconnected" and the UI surfaces a warning.

### Rationale

The spec is explicit (FR-013): "MIDI devices are stored and identified by name, not device ID, as users may own multiple of the same MIDI interfaces." The stated reason — a user may own two of the same model — means that even if we persisted an ID, a second physical instance wouldn't match. Matching by name satisfies the user's mental model: "my Roland A-49 is my Roland A-49, wherever I am."

### Consequences we accept

- Two simultaneously-connected devices with the same name are indistinguishable in this feature. Listed as a limitation in the spec (§Edge Cases).
- A user who renames a device at the OS level would lose their assignment. Acceptable; this is not a common operation.
- Matching is exact string equality, case-sensitive. Platform MIDI APIs normalise names to vendor strings that are stable per-device.

### Alternatives considered

- **Store name + ID, match on name**: rejected — ID serves no purpose in this feature and adds an unused field.
- **Store ID, match on ID**: rejected — fails the "two of the same model" case that motivated this rule.
- **Store both, fuzzy match on name with ID as a tiebreaker**: rejected — overkill; the user already expressed their intent by picking a name.

---

## 3. First-launch state

### Decision

On first launch (or after a storage read miss / parse error), the in-memory state is:

```ts
[
  { id: newId(), size: 88, deviceName: null, channel: null, nickname: null }
]
```

This is synthesised in `KeyboardsContext` — it does NOT write to storage until the user makes a change. This avoids a racey "save-on-mount" that could overwrite legitimate storage between runs.

### Rationale

- Matches spec FR-001 ("On first launch, the list MUST contain exactly one Keyboard with a size of 88").
- Lazy persistence (save only on user change) means a reinstall that recovers old data isn't clobbered by a default write from a pre-migration run.
- A dedicated "first launch" flag is not needed; the read miss itself signals the state.

### Alternatives considered

- **Save the default on first mount**: rejected — defeats the above point, and adds a write that doesn't reflect user intent.
- **Require the user to explicitly create the first Keyboard**: rejected — the spec states the app MUST start with one, and a zero-keyboard state is confusing for first-time users.

---

## 4. Conflict detection

### Decision

Pure function `detectConflicts(keyboards: readonly Keyboard[]): Set<string>` returns the set of Keyboard IDs that are part of any same-device-same-channel conflict. Used by the UI to decorate each Keyboard with the warning state.

```ts
// src/keyboards/conflicts.ts
export function detectConflicts(keyboards: readonly Keyboard[]): Set<string> {
  const buckets = new Map<string, Keyboard[]>();
  for (const kb of keyboards) {
    if (kb.deviceName == null || kb.channel == null) continue;
    const key = `${kb.deviceName}::${kb.channel}`;
    const arr = buckets.get(key) ?? [];
    arr.push(kb);
    buckets.set(key, arr);
  }
  const conflicted = new Set<string>();
  for (const arr of buckets.values()) {
    if (arr.length > 1) {
      for (const kb of arr) conflicted.add(kb.id);
    }
  }
  return conflicted;
}
```

### Rationale

- Pure, O(N) with a map bucket; trivially testable.
- Keyboards without a device or without a channel do not participate in conflicts (they don't identify a uniquely-routable stream yet).
- Returns an ID set so the UI can lookup per-Keyboard without re-scanning the whole list.

### Alternatives considered

- **Return a richer structure** (array of conflict groups with the shared device/channel): rejected — the UI only needs "is this Keyboard part of a conflict," and per-keyboard warning text is derived from its own fields.
- **Detect conflicts at write time** (prevent saving): rejected — spec §Assumptions says conflicts are advisory, not gates.
- **Detect conflicts per-pair inside the render path**: rejected — O(N²) with no benefit; doing it once at the context level is cleaner.

---

## 5. Device-dropdown option list

### Decision

The device dropdown's options are the union of:

1. Currently-connected device names from `useMidiInput().devices` (deduplicated by name — if two connected devices share a name, only one entry).
2. The Keyboard's own persisted `deviceName` if it is NOT in (1) — appended with a visible "disconnected" marker (warning icon).

Sorted alphabetically by name for stability. Placeholder "<No input detected>" is shown when (1) is empty AND the Keyboard's persisted `deviceName` is null.

### Rationale

- Satisfies FR-007, FR-008, FR-009 from spec: users see both live devices and their own stored-but-disconnected assignment.
- Dedup-by-name prevents ghost entries when the platform duplicates a device in its enumeration.
- Alphabetical sort makes the dropdown stable across reconnects; users learn where their devices live.

### Alternatives considered

- **Sort by connection state** (connected first, then disconnected): rejected — creates visual jumps when a device reconnects mid-session.
- **Separate dropdown for connected vs. disconnected**: rejected — extra UI for a rare state. One dropdown with a marker is cleaner.

---

## 6. Channel dropdown — conditional presence

### Decision

The channel dropdown for a Keyboard is rendered iff another Keyboard is assigned to the SAME `deviceName`. When it's rendered, options are 1..16 (displayed 1-indexed; persisted 1-indexed too — we store the user-facing value).

A Keyboard with `channel === null` that just became "shared" (because a sibling Keyboard was assigned to the same device) defaults to the lowest unused channel on that device, not null. If all 16 channels are already taken by siblings on the same device, channel remains `null` (saturation edge case). The UI renders the channel dropdown without a selected value; the user picks a channel manually, which will necessarily overlap another Keyboard and produce a conflict warning via `detectConflicts`. This is a degenerate state — more than 16 keyboards on one device — and unlikely, but the UI and data model must not crash.

### Rationale

- Spec FR-010 requires the dropdown only when two or more Keyboards share a device. Hiding it otherwise keeps the single-keyboard path clean.
- Auto-defaulting to the lowest unused channel reduces busywork when adding a new sibling Keyboard — the user can accept the default and move on, or change it.
- Storing 1-indexed matches the user's mental model (per the glossary: "MIDI channel... displayed as 1-16"). Internally, MIDI bytes use 0-indexed — any future consumer of this data (routing) must translate.

### Alternatives considered

- **Always show the channel dropdown**: rejected — clutters the single-keyboard path and adds a choice with no consequence (all channels behave identically for a lone keyboard).
- **Require the user to set the channel manually on sibling creation**: rejected — the auto-default is safe (picks a free channel) and the user can always change it. Less friction.
- **Store channels 0-indexed internally**: rejected — more translation at storage/read boundaries. Storing user-facing values keeps JSON human-readable.

---

## 7. Dropdown UI primitive

### Decision

Build a generic `<Dropdown />` component in `src/keyboards/Dropdown.tsx` using the same RN `Modal`-based pattern as `src/app/EditViewDropdown.tsx` from feature 003. Props:

```ts
interface DropdownProps<T> {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (next: T) => void;
  placeholder?: string;        // shown when options is empty
  testID?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  trailingIcon?: ReactNode;    // e.g., warning icon when disconnected
}

interface DropdownOption<T> {
  value: T;
  label: string;
  trailingIcon?: ReactNode;    // e.g., warning icon on a disconnected option
}
```

The anchor opens on press; a full-surface `Pressable` backdrop dismisses; tap-outside / back gesture close via `Modal.onRequestClose`.

### Rationale

- We have precedent: the EditViewDropdown pattern works across iOS and Android, handles rotation, and has tests we can copy.
- Generic parameterisation over `T` lets the same component serve three different value types (KeyboardSize, DeviceName, ChannelNumber) without multiple copies.
- Trailing-icon slot covers the "disconnected device" decoration on individual options and the anchor.
- No library dependency.

### Alternatives considered

- **Extract a shared `src/ui/Dropdown` now**: deferred — only two consumers today (EditView and Keyboards). When a third consumer appears, refactor with knowledge of all call sites.
- **Inline dropdowns per control type**: rejected — three near-duplicate implementations would diverge; shared behavior (focus ring, a11y, Modal dismissal) would drift.
- **React Native `Picker`**: rejected — looks wildly different on iOS (wheel picker) vs Android, and doesn't match our dark theme out of the box.

---

## 8. Single-keyboard routing behavior (documentation-only)

### Decision

A single-keyboard setup implicitly consumes MIDI from ALL connected devices on ALL channels. The Setup tab does not show a device or channel dropdown in this state because no routing choice is offered.

This is a **future-routing-consumer** concern — whatever feature implements live MIDI routing must interpret "single keyboard, `deviceName = null`, `channel = null`" as the implicit-omni case.

### Rationale

- Spec §Assumptions makes this explicit.
- Stating it in research.md ensures the follow-on routing feature inherits the correct interpretation rather than re-deriving it.

### Alternatives considered

- **Require the user to explicitly pick a device even for a single keyboard**: rejected — the spec says single-keyboard shows ONLY the size dropdown (FR-005).
- **Default `deviceName` to the first connected device on first launch**: rejected — this forces an arbitrary choice on users who haven't connected anything yet, and creates confusing state.

---

## 9. Layout switching

### Decision

Reuse `useLayoutMode()` from feature 003 (width ≥ 600 → tablet). Render each Keyboard as:

- **Tablet**: `<KeyboardRow />` — a row with the controls bar across the top and a `<Keyboard />` visualization below (from feature 004). Appropriate MIDI range derived from `sizeToRange(kb.size)`. Highlighted keys are empty `[]` in this feature (no note highlighting in Setup).
- **Phone**: `<KeyboardCard />` — a rounded card with the controls only. No visualization.

The `SetupView.tsx` component decides per-keyboard which wrapper to use based on `useLayoutMode()`. Both wrappers share `<KeyboardControls />` internally, so the control logic itself has one home.

### Rationale

- Matches FR-014 and FR-015 exactly.
- Rotation/split-view resize reflow automatically via the existing hook.
- Shared `<KeyboardControls />` means the size / device / channel / nickname logic lives in one place and can't diverge between layouts.

### Alternatives considered

- **One wrapper with conditional `<Keyboard>` rendering**: rejected — the two layouts have materially different container shapes (full-width row vs. contained card) and collapsing them into one component would need conditional styling everywhere. Two wrappers, one shared controls component is clearer.
- **Phone-layout on tablet for narrow split-view**: consistent with the hook's design. No special-casing needed.

---

## 10. Warning icons and contrast

### Decision

Reuse `Ionicons name="warning"` at 16 pt with an amber/orange color. Propose token `colors.warning = '#F59E0B'`. Contrast target: ≥ 3:1 against `surface` for the glyph (WCAG AA UI component standard). Verify in Phase 6.

The warning appears:

- Trailing inside the device dropdown's anchor when the selected device is disconnected.
- Trailing inside a device option in the dropdown's option list when it's a stored-but-disconnected option.
- Inline next to the channel dropdown when a conflict is detected, alongside a short text label (e.g., "Channel conflict").

Each warning carries an `accessibilityLabel` prefix like "Disconnected: " or "Conflict: " so screen-reader users understand the meaning.

### Rationale

- Icon + color + text triple ensures Principle VII compliance (not conveying info by color alone).
- Amber/orange is the universal "advisory, not error" color; stays clear of red (reserved for destructive / blocking failures that we don't have here).
- Principle VI's dark-mode-only theme accommodates warm amber well.

### Alternatives considered

- **Red X for warnings**: rejected — overstates the severity. Conflicts and disconnects are fixable non-blocking states.
- **Custom warning glyph**: rejected — Ionicons is already in the project; a matching glyph is fine.

---

## Cross-cutting notes

- **No native module changes.** No iOS or Android code touched.
- **No new npm dependencies.** Everything needed already exists from features 001–004.
- **Dark-mode palette extensions** are one token addition (`warning`); no existing token values change.
- **Test harness unchanged.** New tests reuse the existing `jest-expo` + `@testing-library/react-native` setup. AsyncStorage is already mocked at the jest config level.
- **Migration path for consumer features** (Patches, Cues, runtime routing): `useKeyboards()` gives them immediate access to the persisted list. They can join `useMidiInput()` to resolve `deviceName` → live device at their leisure.
