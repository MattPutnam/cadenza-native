# UI Contract: MIDI Activity Display, Preferences Gear, Preferences Menu

**Feature**: `002-midi-input-and-preferences`
**Date**: 2026-04-19

Expressed as landmarks, controls, visual constraints, absences, and keyboard behavior per surface. These selectors are what tests pin against and what manual QA reads from.

---

## Edit-mode header (updated)

The existing `EditMode` header adds two new elements. Layout per FR-003 (spec 001) + FR-007/FR-014 (this spec):

```
┌────────────────────────────────────────────────────────────────────┐
│ [ Perform ]     [   MIDI activity display (centered)   ]    [ ⚙ ]  │
└────────────────────────────────────────────────────────────────────┘
   left                         center                        right
```

### Landmarks

| TestID            | Notes                                             |
| ----------------- | ------------------------------------------------- |
| `edit-header`     | Existing header landmark (from spec 001).        |
| `midi-activity`   | NEW — the MIDI activity display container.      |

### Controls

| TestID / Role             | Accessibility label                             | Effect                                  |
| ------------------------- | ----------------------------------------------- | --------------------------------------- |
| `button` / `Perform`       | "Perform"                                       | (Existing) mode → perform.             |
| `button` / `Preferences`   | "Preferences"                                  | NEW — opens the preferences overlay.   |

### Visual constraints

- `midi-activity` occupies the horizontal center of the header; neither the Perform button nor the gear may overlap it on any supported width.
- `midi-activity` text uses `theme.colors.textPrimary` or `textSecondary` (implementation chooses) against the header's `surfaceElevated` background, with WCAG AA contrast.
- Gear icon: `@expo/vector-icons` Ionicons `settings-outline`, sized 28pt, wrapped in a `Pressable` with padding + `hitSlop` such that the touch target is ≥44pt iOS / ≥48dp Android.

### Absences

- No stale message remains visible if the user force-quits and relaunches — cold-launch state shows the idle placeholder.

### Keyboard behavior

- Tab order left → center → right: Perform → MIDI activity (non-interactive, skipped by focus) → Preferences gear.
- Focus ring on the gear uses `theme.colors.focusRing`, clearly visible against `surfaceElevated`.
- Enter / Space on the focused gear opens the preferences overlay.

---

## MIDI activity display

A non-interactive text element subscribing to the last-message stream.

### Content contract

- **Idle state** (no messages yet in the session): shows `"No MIDI input"`.
- **Active state** (at least one message received): shows a one-line abbreviated representation of the most recent message. Format per message type:

  | Message type        | Abbreviated form MUST include                                               |
  | ------------------- | --------------------------------------------------------------------------- |
  | `noteOn`            | type label, channel (1–16), note name+octave (e.g., "C4"), velocity (0–127) |
  | `noteOff`           | type label, channel, note name+octave, velocity                             |
  | `controlChange`     | type label, channel, controller number (0–127), value (0–127)               |
  | `programChange`     | type label, channel, program number (0–127)                                  |
  | `pitchBend`         | type label, channel, signed pitch value                                      |
  | `channelPressure`   | type label, channel, pressure (0–127)                                        |
  | `polyAftertouch`    | type label, channel, note name+octave, pressure                              |
  | `sysex`             | type label, payload length in bytes (e.g., "SysEx (18 bytes)")               |
  | system real-time    | type label only (these are only visible when `ignoreSystemRealTime` is OFF)  |
  | `unknown`           | type label, first byte in hex (e.g., "Unknown 0xF4")                         |

- Exact punctuation and word order are an implementation detail; tests pin field presence via substring, not exact equality.

### Keyboard behavior

- Not focusable.

### Update cadence

- MUST reflect a new message within 100ms of its receive timestamp (SC-001, SC-002).
- MUST update at most once per animation frame (~60 Hz on the primary tablet target), regardless of the incoming message rate.

### Absences

- MUST NOT render when `mode === 'perform'` (enforced by `Shell`).
- MUST NOT render any message the filter layer dropped (FR-006, FR-006a).

---

## Preferences overlay

A full-screen modal presenting the preferences list.

### Presentation

- React Native `Modal` with `animationType="slide"`, `presentationStyle="fullScreen"`, `transparent={false}`.
- Backdrop is `theme.colors.surface` (opaque, not a translucent scrim).
- Layout top-to-bottom:
  1. **Top bar** — title ("Preferences") and a close (×) control in the top-left (matching the Perform-mode close control's placement).
  2. **Preferences list** — one row per schema entry, top-to-bottom.

### Landmarks

| TestID                | Notes                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| `prefs-overlay`       | The root `Modal` content container.                                  |
| `prefs-title`         | Heading text "Preferences".                                          |
| `prefs-row-<key>`     | One per preference (e.g., `prefs-row-ignoreSysEx`).                 |

### Controls

| TestID / Role                            | Accessibility label                               | Effect                                                             |
| ---------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| `button` / `Close Preferences`            | "Close Preferences"                              | Closes the overlay.                                                |
| `switch` / `Ignore SysEx`                 | "Ignore SysEx"                                    | Toggles `ignoreSysEx`.                                             |
| `switch` / `Ignore System Real-Time`      | "Ignore System Real-Time"                         | Toggles `ignoreSystemRealTime`.                                   |

### Visual constraints

- Native `Switch` with `trackColor` / `thumbColor` from `theme.colors`. Contrast between thumb and track ≥ 3:1; track on/off states must be distinguishable by position + the visible label ("On" / "Off" next to the switch) in addition to color.
- Each row ≥ 48dp tall; tap anywhere on the row toggles the switch (the whole row is a `Pressable` with the switch as a visual-only child).

### Keyboard behavior

- On open, focus moves to the close control.
- Tab order: close → first toggle → second toggle (→ close, if cyclical). No element outside the overlay may receive focus while it is open (focus trap).
- Enter / Space on the close control or the OS back gesture (Android) dismisses the overlay.
- On dismiss, focus returns to the gear icon in the Edit header.

### Dismissal

- Explicit close control (tap or keyboard activation) (FR-020).
- `onRequestClose` (Android back button) also dismisses (FR-020).
- No tap-outside dismissal — the overlay is full-screen (no outside).

---

## MidiInputContext (programmatic contract)

Not a UI contract per se, but tests pin to it.

```ts
interface MidiInputContextValue {
  subscribe(listener: (msg: MidiMessage) => void): () => void;
  devices: readonly MidiDevice[];
}
```

Behavioral guarantees:

- `subscribe` MUST return a callable unsubscribe.
- Listeners MUST be invoked synchronously for each filter-passing message.
- A listener that throws MUST NOT prevent other listeners from being invoked for the same message.
- `devices` MUST reflect the current connected device set; hot-plug events update it without unmount.

---

## PreferencesContext (programmatic contract)

```ts
interface PreferencesContextValue {
  prefs: Preferences;
  isLoaded: boolean;
  setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void;
}
```

Behavioral guarantees:

- `prefs` equals the documented defaults before `isLoaded === true`.
- `setPreference` updates `prefs` synchronously and persists asynchronously.
- Reading `prefs` is safe at any point; consumers that must not run with defaults MAY guard on `isLoaded`.

---

## Tests that enforce this contract

| Test file                                   | What it pins                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `__tests__/midi/parser.test.ts`              | Every message-type branch of `parseMidiMessage`.                                                   |
| `__tests__/midi/filter.test.ts`              | All four combinations of `ignoreSysEx` × `ignoreSystemRealTime` × SysEx/RT/other messages.        |
| `__tests__/midi/format.test.ts`              | Abbreviated-format field presence per message type.                                                |
| `__tests__/midi/MidiInputContext.test.tsx`   | Subscribe/unsubscribe, hot-plug via mock, listener-throws isolation, devices state.                |
| `__tests__/midi/useMidiLastMessage.test.tsx` | rAF coalescing: many pushes per frame → one render, latest wins.                                   |
| `__tests__/prefs/schema.test.ts`             | Schema defaults match the documented values.                                                       |
| `__tests__/prefs/storage.test.ts`            | Read-miss → defaults; read-error → defaults; write catches exceptions.                             |
| `__tests__/prefs/PreferencesContext.test.tsx`| `isLoaded` gating; `setPreference` updates; in-memory precedence over storage.                     |
| `__tests__/app/MidiActivityDisplay.test.tsx` | Idle placeholder; renders formatted message; re-renders on new message.                            |
| `__tests__/app/PreferencesMenu.test.tsx`     | Landmarks + controls present; toggling fires `setPreference`; close dismisses; focus-trap basics.   |
| `__tests__/app/EditMode.test.tsx` (update)  | Gear + activity landmarks present; tapping gear opens overlay; existing Perform-button tests pass. |
