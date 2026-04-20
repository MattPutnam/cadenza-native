# Phase 1 Data Model: App Shell — Edit and Perform Modes

**Feature**: `001-app-shell-modes`
**Date**: 2026-04-19

This feature introduces a single piece of domain state. No persisted entities, no external schemas.

## Entity: Mode

The top-level user-facing state of the application.

### Values

| Value       | Meaning                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `'edit'`    | The user is configuring the app. A header bar is visible at the top; below it is the editing surface. |
| `'perform'` | The user is on stage. The screen is filled with black and shows only the "x" close control.           |

Exactly one value is active at any time. No "in between" states are representable.

### Representation

```ts
// src/mode/ModeContext.tsx
export type Mode = 'edit' | 'perform';

export interface ModeContextValue {
  mode: Mode;
  setMode: (next: Mode) => void;
}
```

- The source of truth is a single `ModeContext` at the app root.
- Consumers read `{ mode, setMode }` via the `useMode()` hook.
- The context's initial `mode` is `'edit'` (FR-002).

### Allowed transitions

```text
        tap "Perform"
 edit ──────────────────► perform
      ◄──────────────────
            tap "x"
```

Only two transitions are permitted, each triggered by exactly one UI control:

| From → To         | Trigger                                  | Enforced by                                    |
| ----------------- | ---------------------------------------- | ---------------------------------------------- |
| `edit` → `perform`| Tap / activate "Perform" button in header| `EditMode`'s control calls `setMode('perform')`|
| `perform` → `edit`| Tap / activate "x" close control         | `PerformMode`'s control calls `setMode('edit')`|

No other code path MUST call `setMode`. Later features may extend this (e.g., triggers that enter Perform mode automatically) via a spec amendment.

### Lifecycle

- **Creation**: `mode` is initialized to `'edit'` every time the app cold-launches.
- **Persistence within a session**: React state survives backgrounding / foregrounding of the app on both iOS and Android (the component tree is not unmounted), satisfying FR-010 without explicit persistence.
- **Persistence across cold launch**: None. FR-002 mandates cold launch = `'edit'`.

### Invariants

- `mode ∈ { 'edit', 'perform' }` — the type forbids any other value at compile time.
- Exactly one of `EditMode` / `PerformMode` is mounted at any time, and it is the one corresponding to `mode`.
- The only side-effects of a mode change in this feature are re-rendering the shell. No MIDI, audio, storage, or network activity is triggered. (This is intentional scope-narrowing; later features will attach side-effects behind their own entities and tests.)

### Validation rules

Since the state is a typed enum with a single writer, there is nothing to validate at runtime. Tests verify that:

1. The initial value is `'edit'`.
2. Calling `setMode('perform')` results in `mode === 'perform'` on the next render.
3. Calling `setMode('edit')` from `'perform'` results in `mode === 'edit'`.
4. Rendering outside a `<ModeProvider>` throws a clear developer-facing error (so we don't silently render a surface with no way to exit it).

## Non-entities

For clarity: the following are **not** persisted, stored, or tracked by this feature and do NOT appear in the data model.

- Show state, cue index, active song — introduced by later features.
- MIDI device inventory, connected synths, patch banks — introduced by later features.
- User preferences, UI settings — introduced by later features (if at all).
- History of mode transitions — not needed; no feature consumes it.
