# Phase 1 Data Model: MIDI Input, Activity Display, and Preferences System

**Feature**: `002-midi-input-and-preferences`
**Date**: 2026-04-19

Four entities are introduced. Only one (`Preferences`) is persisted.

---

## Entity: MidiDevice

A MIDI input source the platform has exposed to the app.

### Shape

```ts
// src/midi/types.ts
export interface MidiDevice {
  /** Opaque platform-assigned identifier, stable for the lifetime of the OS-level connection. */
  readonly id: string;
  /** Human-readable name (e.g., "Yamaha P-515", "MidiKeys Virtual Port"). */
  readonly name: string;
  /** Which platform transport exposed this device. */
  readonly transport: 'usb' | 'bluetooth' | 'virtual' | 'unknown';
}
```

### Lifecycle

- **Created** when the native module reports a device has appeared (either at startup during initial enumeration or on a hot-plug event).
- **Destroyed** when the native module reports the device has disappeared. Consumers observing the device list MUST handle disappearance without error.

### Invariants

- `id` is stable per platform connection. After disconnect + reconnect, the platform MAY issue a new id; Cadenza does not attempt to reconcile them in this feature.
- Multiple devices may have the same `name`; `id` is the uniqueness key.

### Not tracked

- Per-device message counts, last-message timestamp, or any statistics — these are not required by any FR in this feature.

---

## Entity: MidiMessage

A parsed inbound MIDI event. Represented as a TypeScript discriminated union on `type`.

### Shape

```ts
// src/midi/types.ts
export type MidiChannel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

interface Base {
  /** Device this message arrived from (for display / debug only). */
  readonly deviceId: string;
  /** Receive timestamp in milliseconds since an arbitrary epoch; monotonic. */
  readonly timestamp: number;
}

export type MidiMessage =
  | (Base & { type: 'noteOn';           channel: MidiChannel; note: number /* 0-127 */; velocity: number /* 0-127 */ })
  | (Base & { type: 'noteOff';          channel: MidiChannel; note: number;              velocity: number })
  | (Base & { type: 'controlChange';    channel: MidiChannel; controller: number;         value: number })
  | (Base & { type: 'programChange';    channel: MidiChannel; program: number })
  | (Base & { type: 'pitchBend';        channel: MidiChannel; value: number /* -8192..8191 */ })
  | (Base & { type: 'channelPressure';  channel: MidiChannel; pressure: number })
  | (Base & { type: 'polyAftertouch';   channel: MidiChannel; note: number;               pressure: number })
  | (Base & { type: 'sysex';            bytes: Uint8Array /* includes F0/F7 framing */ })
  | (Base & { type: 'clock' })
  | (Base & { type: 'start' })
  | (Base & { type: 'continue' })
  | (Base & { type: 'stop' })
  | (Base & { type: 'activeSensing' })
  | (Base & { type: 'systemReset' })
  | (Base & { type: 'unknown'; bytes: Uint8Array });
```

### Lifecycle

- **Created** by `parseMidiMessage` from raw bytes emitted by the native module.
- Delivered to subscribers synchronously in the frame the native event fires, subject to filter rules.
- **Destroyed** (GC'd) after subscribers return; no message history is retained by the subsystem in this feature.

### Validation rules

- `channel` on channel-scoped messages MUST be in 1..16 (the project glossary uses 1-based channels; the wire representation 0..15 is converted in the parser).
- `note`, `velocity`, `controller`, `value`, `program`, `pressure` MUST be in 0..127 where applicable; the parser normalizes to this range, never raising for malformed bytes (best-effort parse; fall through to `unknown`).
- `pitchBend.value` MUST be in -8192..8191 (the parser converts the 0..16383 wire representation).
- `sysex.bytes` starts with `0xF0` and ends with `0xF7` (or end-of-buffer if truncated); the parser trusts the native module's SysEx aggregation.

### State transitions

None. Messages are immutable once created.

---

## Entity: Preferences

All user-configurable settings. Schema-driven so new entries add in one place.

### Shape

```ts
// src/prefs/schema.ts
export const PREFERENCES_SCHEMA = {
  ignoreSysEx:          { default: true, type: 'boolean' as const },
  ignoreSystemRealTime: { default: true, type: 'boolean' as const },
} as const;

export type Preferences = {
  ignoreSysEx: boolean;
  ignoreSystemRealTime: boolean;
};
```

### Defaults

- `ignoreSysEx = true` — SysEx is filtered by default.
- `ignoreSystemRealTime = true` — System Real-Time messages are filtered by default (Clarifications Q1 / FR-019).

### Lifecycle

- **First launch**: `PreferencesContext` reads `AsyncStorage` under `cadenza.preferences.v1`. On miss → all defaults.
- **Subsequent launches**: reads the persisted JSON blob, merges missing keys from defaults (forward-compatibility for future preferences).
- **In-session changes**: `setPreference(key, value)` updates the in-memory value synchronously and writes the full blob to `AsyncStorage` asynchronously.

### Invariants

1. Values are loaded (or fallen-back to defaults) before any consumer reads them in the session. `isLoaded === true` gates `MidiInputContext`'s first subscription.
2. Changes take effect immediately in memory; filter behavior updates on the next incoming message.
3. Writes are best-effort and never throw to callers; failures are logged and retried on next change.
4. A schema key without a persisted value MUST take its default (this makes adding a preference in a later feature strictly additive).

---

## Entity: MidiInputSubscriber

A listener registered with `MidiInputContext` to receive every filter-passing `MidiMessage`.

### Shape

```ts
type Unsubscribe = () => void;

interface MidiInputContextValue {
  subscribe: (listener: (msg: MidiMessage) => void) => Unsubscribe;
  /** Current list of known devices (derived state, updated on device-change events). */
  devices: readonly MidiDevice[];
}
```

### Lifecycle

- **Created** when a component calls `subscribe(listener)`. The unsubscribe fn removes the listener.
- **Destroyed** when the caller invokes the unsubscribe. React hooks built on top (e.g., `useMidiLastMessage`) call `unsubscribe` in the `useEffect` cleanup.

### Invariants

- `subscribe` MUST NOT be called before `PreferencesContext.isLoaded` is true (the MIDI context itself enforces this).
- Listeners receive messages synchronously in the frame they arrive. A listener that throws MUST NOT prevent other listeners from receiving the message.
- Removing a listener inside its own callback MUST be safe.

---

## Relationships

```text
            ┌────────────────────────────────────┐
            │  Native module (CoreMIDI / MIDI)   │
            │  emits: raw bytes + deviceId + ts  │
            └──────────────┬─────────────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │     parser.ts (pure)               │
            │   bytes → MidiMessage              │
            └──────────────┬─────────────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │     filter.ts (pure)               │
            │   (msg, prefs) → boolean           │
            └──────────────┬─────────────────────┘
                           │  passes
                           ▼
            ┌────────────────────────────────────┐
            │   MidiInputContext subscriber set   │
            │   calls each listener(msg)          │
            └──────────────┬─────────────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │   useMidiLastMessage hook           │
            │   (rAF-coalesced setState)          │
            └──────────────┬─────────────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │   <MidiActivityDisplay/>            │
            │   renders format(msg)               │
            └────────────────────────────────────┘

            ┌────────────────────────────────────┐
            │      PreferencesContext             │
            │      (AsyncStorage-backed)          │
            └────────────────┬───────────────────┘
                             │
          reads prefs ◄──────┘        ┌──── opens ───┐
          in filter.ts                │               │
                                      ▼               │
                           ┌──────────────────┐       │
                           │ <PreferencesMenu>│       │
                           │  Modal (full-    │       │
                           │  screen overlay) │       │
                           └──────────────────┘       │
                                                      │
                           <EditMode> gear ───────────┘
```

## Non-entities

- **MIDI history** — we do not retain past messages. The display always shows the latest.
- **Per-channel aggregation, statistics, activity meters** — not in scope for this feature.
- **Device-to-port routing** — a later cue/patch feature; not relevant here.
- **Output buffers** — MIDI output is out of scope per the spec's Assumptions.
