# Data Model: Setup Tab — Keyboard Configuration

**Feature**: `005-setup-keyboards`
**Date**: 2026-04-22

---

## KeyboardSize (value type)

One of the seven supported controller sizes.

```ts
// src/keyboards/types.ts
export type KeyboardSize = 25 | 37 | 49 | 61 | 73 | 76 | 88;
export const KEYBOARD_SIZES: readonly KeyboardSize[] = [25, 37, 49, 61, 73, 76, 88] as const;
```

### Size → MIDI range mapping

| Size | MIDI Low | Low Note | MIDI High | High Note |
|------|----------|----------|-----------|-----------|
| 25   | 48       | C3       | 72        | C5        |
| 37   | 48       | C3       | 84        | C6        |
| 49   | 36       | C2       | 84        | C6        |
| 61   | 36       | C2       | 96        | C7        |
| 73   | 28       | E1       | 100       | E7        |
| 76   | 28       | E1       | 103       | G7        |
| 88   | 21       | A0       | 108       | C8        |

All low/high notes are white keys — required by the `<Keyboard>` component's contract from feature 004.

```ts
// src/keyboards/schema.ts
export interface KeyboardRange {
  readonly low: number;
  readonly high: number;
}

export function sizeToRange(size: KeyboardSize): KeyboardRange;
```

### Invariants

1. `KEYBOARD_SIZES` is exactly the seven entries, in ascending order.
2. `sizeToRange(s).low` and `.high` are both white keys for every `s` in `KEYBOARD_SIZES`.
3. `sizeToRange(s).high - sizeToRange(s).low + 1 === s` (i.e., the MIDI range count matches the key count).
4. Function is pure; no I/O, no randomness.

---

## Keyboard (domain entity — persisted)

One user-configured keyboard entry.

```ts
// src/keyboards/types.ts
export interface Keyboard {
  readonly id: string;                // opaque UUID-ish stable identifier
  readonly size: KeyboardSize;
  readonly deviceName: string | null; // as reported by the platform at selection time
  readonly channel: number | null;    // 1..16 (1-indexed, user-facing), or null when not applicable
  readonly nickname: string | null;   // free-form, up to 32 chars, may repeat across Keyboards
}
```

### Field invariants

1. `id`: non-empty string. Generated at `add` time via `crypto.randomUUID()` (or a deterministic fallback in tests).
2. `size`: one of the seven `KEYBOARD_SIZES`.
3. `deviceName`: `null` or a non-empty string. Empty string is not a valid device name.
4. `channel`: `null` or an integer in [1, 16]. Typical legal values:
   - `null` when the Keyboard is alone on its device or has no device.
   - An integer in [1, 16] when the Keyboard shares a device with at least one other Keyboard.
   - `null` when the Keyboard shares a device but all 16 channels are already taken by siblings on that same device — a saturation edge case. In that state the UI's channel dropdown renders without a selected value (no auto-default is possible) and the user must manually pick a channel, which will necessarily overlap another Keyboard (producing a conflict warning via `detectConflicts`). The data model permits `null` here rather than coercing to a guaranteed-conflict value.
5. `nickname`: `null` or a string of length 0..32. A zero-length string IS allowed but behaves identically to `null` (both display as the default label via `displayName`). Implementations MAY normalise `""` → `null` on save. Character set is Unicode — emoji and non-ASCII characters are permitted. Newlines are NOT expected to appear in nicknames; the UI uses a single-line `<TextInput>` (`multiline={false}` by default), which suppresses them at the input level. No server-side validation or sanitisation of nickname content is performed.

### Computed properties (not persisted)

- `range = sizeToRange(size)` — derived from `size`.
- `isDeviceConnected(keyboard, liveDevices)` — `true` iff `deviceName` is non-null and matches a live device name.
- `displayName(keyboard, position)` — nickname if non-empty, else `"Keyboard ${position+1}"`.

---

## Keyboards (domain collection — persisted)

The ordered list of `Keyboard` entries.

### Shape

```ts
// Persisted at AsyncStorage key 'cadenza.keyboards.v1'
type StoredSetup = {
  readonly version: 1;
  readonly keyboards: readonly Keyboard[];
};
```

### Collection invariants

1. Always at least one Keyboard exists. An attempt to `remove` the last Keyboard MUST be a no-op (UI hides/disables the action).
2. First-launch (read miss / parse error) synthesises a single default Keyboard: `{ size: 88, deviceName: null, channel: null, nickname: null }`.
3. Display order == creation order. Reordering is out of scope in this feature.
4. IDs within the collection MUST be unique.
5. Channel values MAY collide (conflict) across entries; the UI surfaces the conflict but does not block saving.

---

## KeyboardsContext (session + persistence)

React context providing the live Keyboards list and CRUD operations.

```ts
// src/keyboards/KeyboardsContext.tsx
export interface KeyboardsContextValue {
  readonly keyboards: readonly Keyboard[];
  readonly isLoaded: boolean;
  add: () => void;                                             // appends a new default Keyboard
  update: (id: string, patch: Partial<Omit<Keyboard, 'id'>>) => void;
  remove: (id: string) => void;                                // no-op when only 1 Keyboard remains
}
```

### Provider invariants

1. Mounted in `App.tsx` between `<ModeProvider>` and `<Shell/>` so every screen can read the state.
2. On mount, runs `loadKeyboards()`; on success, uses the stored list; on miss / parse error, uses the default single-88 state. `isLoaded` flips from `false` to `true` once the initial load resolves (either path).
3. CRUD operations update state synchronously. After each update, an async `saveKeyboards(list)` runs; save failures are logged (non-modal) but do NOT roll back the in-memory state.
4. `add()` appends `{ id: newId(), size: 88, deviceName: null, channel: null, nickname: null }`.
5. `update(id, patch)` applies shallow merge on the Keyboard matching `id`. Unknown `id` is a no-op.
6. `remove(id)` removes the Keyboard matching `id` iff the list has more than one entry. Otherwise no-op.
7. No AsyncStorage access outside of `storage.ts` — the context calls `load`/`save` and handles nothing else.
8. The context value is `useMemo`-stable: CRUD function identities don't change across renders when their dependencies (setState) are stable.

### State transitions

```text
        add()
     ┌─────────►  [keyboards + 1 new default]
     │
INIT ─┤  update(id, patch)                save pending → save ok (or save error, state unchanged)
     │─────────►  [patched keyboard]     ─────────────────►  ...
     │
     │  remove(id)  (only when length > 1)
     └─────────►  [keyboards - 1]
```

On cold launch, the initial state is either the loaded list (if storage had one) or the default single-88 list (if read miss / parse error). Session-scoped state during the app lifetime is identical in both paths.

---

## Conflict (derived)

Not persisted; derived from the current Keyboards list.

```ts
// src/keyboards/conflicts.ts
export function detectConflicts(keyboards: readonly Keyboard[]): Set<string>;
```

### Definition

A Keyboard `k` is "in conflict" iff there exists another Keyboard `k'` with `k.id !== k'.id`, `k.deviceName === k'.deviceName` (both non-null), AND `k.channel === k'.channel` (both non-null).

`detectConflicts` returns the set of all conflicting Keyboard IDs.

### Invariants

1. Pure function; same input produces same output.
2. Keyboards with `deviceName === null` or `channel === null` are NEVER in conflict (they don't identify a routable stream).
3. Result size is 0 or ≥ 2 (a single Keyboard cannot be in conflict alone).
4. Time complexity O(N) with a Map bucket; space O(N) for the bucket map.

---

## Device list (runtime — read from MidiInputContext)

Not part of this feature's persisted model. Consumed from `useMidiInput().devices`.

```ts
// Already exists in src/midi/types.ts
export interface MidiDevice {
  readonly id: string;
  readonly name: string;
  readonly transport: MidiTransport;
}
```

Used for:

- Populating the device dropdown's option list (by `name`, deduplicated).
- Determining whether a Keyboard's `deviceName` is currently connected (membership test against `devices.map(d => d.name)`).

This feature does NOT modify `MidiInputContext` or `MidiDevice`.

---

## Relationships

```
App
 └── KeyboardsProvider (persisted Keyboards list)
      └── (Shell)
           └── (EditMode)
                └── (Setup sub-view — this feature)
                     └── SetupView
                          ├── useKeyboards()        ──► Keyboards list + CRUD
                          ├── useMidiInput()        ──► live devices (read-only)
                          ├── useLayoutMode()       ──► tablet vs phone
                          └── detectConflicts(keyboards)  ──► Set<id>
                          │
                          └── per Keyboard:
                               ├── (tablet) KeyboardRow ─► KeyboardControls + <Keyboard/>
                               └── (phone)  KeyboardCard ─► KeyboardControls only
                                           KeyboardControls:
                                            ├── Dropdown (Size)
                                            ├── Dropdown (Device)   [multi only]
                                            ├── Dropdown (Channel)  [device-shared only]
                                            └── TextInput (Nickname) [multi only]
```

---

## Not modeled

- **Reordering**: out of scope per FR-018. No `order` or `position` field.
- **Deep device fingerprint** (manufacturer, product ID, etc.): out of scope per FR-013. Only `deviceName` is stored.
- **Runtime routing state** (which Keyboard a live note belongs to): out of scope. Consumer features will compute this from Keyboards + MidiMessage.
- **Migration from a `v0` schema**: there is no `v0`; this is the first version. Future versions will bump the `version` field and handle migration in `storage.ts`.
- **Per-Keyboard preferences** (e.g., split points, transposition): out of scope. Future features.
- **Validation of channel uniqueness on save**: conflicts are advisory, not blocking.
