# Implementation Plan: MIDI Input, Activity Display, and Preferences System

**Branch**: `002-midi-input-and-preferences` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-midi-input-and-preferences/spec.md`

## Summary

Introduce the app's platform MIDI input layer plus the user-facing surfaces that depend on it: a live MIDI activity readout in the center of the Edit-mode header, and a preferences system (reached via a gear icon on the right of the header) that initially exposes two filter toggles — **Ignore SysEx** (default OFF) and **Ignore System Real-Time** (default ON). Preferences persist across cold launches.

Technical approach: add a **custom Expo native module** (`modules/expo-cadenza-midi`, local autolinked) wrapping CoreMIDI on iOS and `MidiManager` on Android. The module exposes a typed JS interface that emits device-change events and parsed MIDI messages. A pure-JS **filter/parse/format layer** sits on top, feeding a `MidiInputContext` that filters messages per the active preferences and exposes a throttled "last message" stream to the UI. Preferences live in a `PreferencesContext` backed by `AsyncStorage` (via `@react-native-async-storage/async-storage`, installed with `expo install`). The preferences UI is a full-screen `Modal` overlay. No third-party MIDI wrapper library is adopted; the custom module keeps the MIDI hot path under our control per Principle II and leaves room for a later MIDI-output feature to extend the same module.

This is the first feature that requires **leaving Expo Go** — platform MIDI needs native code, which means we switch to Expo's Dev Client build path (`expo-dev-client` + `npx expo prebuild` + `npx expo run:ios`/`run:android`). Day-to-day dev server + hot reload still works; only the binary changes.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict); native code Swift (iOS) + Kotlin (Android) inside the local Expo module.
**Primary Dependencies**: React Native 0.81.5, Expo SDK ~54 (existing). **New:** `expo-dev-client` (replaces Expo Go for our dev builds), `@react-native-async-storage/async-storage` (preferences persistence), a local Expo native module `modules/expo-cadenza-midi` (custom, not from npm). The existing `react-native-safe-area-context` and `@expo/vector-icons` are reused.
**Storage**: `AsyncStorage` key `cadenza.preferences.v1` holding a JSON blob of the user's preferences. Preferences are the only persisted state introduced by this feature. MIDI messages and device state are in-memory only.
**Testing**: `jest-expo` + `@testing-library/react-native` (existing). New unit-test targets: `parser.test.ts`, `format.test.ts`, `filter.test.ts`. New integration-level tests: `MidiInputContext.test.tsx`, `PreferencesContext.test.tsx`, `PreferencesMenu.test.tsx`, updated `EditMode.test.tsx`. Native Expo module code is tested via the JS surface it exposes (we mock the module in Jest).
**Target Platform**: iOS 17+ and Android (Pixel Tablet class). Bluetooth MIDI works once paired at the OS level; USB and virtual ports via the platform's built-in MIDI APIs. Web inherits a no-op MIDI platform adapter (the display shows "No MIDI input" forever).
**Project Type**: mobile-app (Expo managed workflow transitioning to Dev Client).
**Performance Goals**:
- MIDI receive path (native → JS listener) under 5ms on the primary tablet target, no allocations beyond the parsed message object.
- Display update latency ≤100ms after message receipt (SC-002).
- Display throttle cap: at most one update per animation frame (~60 Hz, i.e., ~16.7ms on a 60 Hz panel — well inside the ≤100ms budget above), guaranteeing readability under dense CC/aftertouch streams.
**Constraints**:
- Principle II — MIDI receive path MUST NOT block, allocate large objects, or hold locks; filtering MUST be O(1) per message.
- Principle I — device disconnect, storage read/write failures MUST degrade gracefully and not crash the app.
- Principle VI — all new controls (gear, toggles, close) ≥44pt/48dp; dark theme; no hover; no multi-touch required.
- Principle VII — keyboard-reachable with focus ring visible against dark backgrounds; state conveyed beyond color alone.
- iOS entitlements: MIDI is available without a special entitlement, but Bluetooth MIDI needs `NSBluetoothAlwaysUsageDescription` in `Info.plist`.
- Android: the `android.hardware.usb.host` feature + `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` permissions for BLE MIDI (API 31+). Configured in `app.json` under `android.permissions`.
**Scale/Scope**: ~2 preferences in this feature (expandable). MIDI message rate up to several kHz combined across devices sustained (worst-case sweep + clock). Surface area: 1 local native module, 2 new React contexts, ~5 new React components, ~3 new pure-logic modules (parser, format, filter), and ~10 new test files. Expected delta ~1500–2500 LOC across JS/TS/Swift/Kotlin.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `constitution.md` v1.1.0. For each principle, marked **applicable** (with compliance plan) or **not applicable** (trivially compliant).

### I. Reliability During Performance (NON-NEGOTIABLE) — **applicable, pass**

- Device disconnect handled explicitly by the native module: unsubscribing is graceful, no exceptions bubble up, existing subscriptions to other devices remain live.
- `AsyncStorage` read/write failures are caught in `PreferencesContext`; on read failure we fall back to defaults for the session (logged, non-modal) and continue running. On write failure we keep the in-memory change and retry on next change; the app never blocks waiting for storage.
- If the native MIDI module fails to load (e.g., on web), a no-op platform adapter takes its place. The activity display shows "No MIDI input" and the rest of the app runs normally.
- No blocking work on the MIDI receive path; parsing + filtering are synchronous bounded operations.

### II. Real-Time MIDI Path Integrity — **applicable, pass**

- Native → JS: messages are emitted with their native receive timestamp; JS-side handler path is `onNativeMessage(bytes, timestamp, deviceId)` → `parseMidiMessage(bytes)` → `filterByPreferences(msg)` → `emitToSubscribers(msg)`. No storage access, no locks, no `async`/`await`.
- The throttle for the DISPLAY lives at the subscriber (`useMidiLastMessage`), implemented as `requestAnimationFrame` coalescing. The subsystem itself delivers every message unthrottled to every subscriber.
- Parser, filter, and format are pure functions with tests covering every message-type branch; determinism is enforced by unit tests.

### III. Hardware-First Sound Architecture — **applicable, trivially pass**

- This feature only reads MIDI. No audio synthesis, no sampler, no audio graph is introduced.

### IV. Test-First for Stage-Affecting Logic — **applicable, mostly in scope**

The MIDI parse/filter pipeline is on the critical path that WILL affect the stage once MIDI output is added in a later feature. Tests therefore MUST precede implementation for:

- `parser.ts` — unit tests per MIDI message type (Note On, Note Off, CC, Program Change, Pitch Bend, Channel Pressure, Polyphonic Aftertouch, SysEx, each System Real-Time type).
- `filter.ts` — `ignoreSysEx` ON/OFF, `ignoreSystemRealTime` ON/OFF, all 4 combinations.
- `format.ts` — one test per message type verifying the abbreviated representation contains the required fields (not a specific literal string).
- `PreferencesContext.tsx` — default values, load-from-storage, save-to-storage, in-memory precedence, read-before-consumer invariant.

Tests are NOT strictly required by Principle IV for non-stage-affecting UI (the gear icon, the menu chrome), but they are included because they are cheap once the harness exists.

### V. Spec-Driven, Feature-Branch Development — **applicable, pass**

- Spec exists, clarified, on this feature branch. Constitution Check is this section. Plan + tasks + implementation will stay on `002-midi-input-and-preferences` until merged into `main`.

### VI. Touch-First Performer UX — **applicable, pass**

- Gear icon: ≥44pt/48dp hit area with padding; placed on the right of the Edit header, mirroring the "Perform" button on the left (symmetric balance).
- Toggle switches use the platform `Switch` component (iOS/Android native switches hit ≥44pt naturally).
- Full-screen preferences overlay (per clarification) leaves maximum room for future preferences and is identical across tablet and phone; no hover affordances, no multi-touch.
- Dark theme throughout, including the modal backdrop and switch track/thumb colors — new tokens if needed go in `src/theme/colors.ts`.

### VII. Focused Accessibility — **applicable, pass**

- All new controls (gear, each toggle, close) have `accessibilityRole`, `accessibilityLabel`, keyboard reachability, and visible focus states using `colors.focusRing`.
- Toggle state is conveyed by (a) position of the switch thumb, (b) accompanying label, and (c) accessibility state (`accessibilityState={{ checked }}`), not by color alone. WCAG AA contrast verified for the new palette additions.
- The menu overlay traps keyboard focus while open; first focused element is the first toggle; closing returns focus to the gear icon.

**Gate result (pre-Phase 0)**: PASS. Complexity Tracking entries follow for the **architectural shifts** this feature requires — these are not violations but are material decisions that the planner wants visible to reviewers.

## Project Structure

### Documentation (this feature)

```text
specs/002-midi-input-and-preferences/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/                   # Phase 1 output
│   └── ui-surfaces.md
├── checklists/
│   └── requirements.md          # Already created by /speckit.specify
└── tasks.md                     # Phase 2 output (/speckit-tasks, not this command)
```

### Source Code (repository root)

```text
App.tsx                                   # Existing — add <PreferencesProvider> + <MidiInputProvider> above <ModeProvider>
index.ts                                  # Existing — unchanged
app.json                                  # Update: add "expo-dev-client" plugin; Android permissions; iOS bluetooth usage string
package.json                              # Add deps (see Technical Context)

modules/expo-cadenza-midi/                # NEW — local Expo native module
├── expo-module.config.json
├── index.ts                              # Typed JS facade
├── CadenzaMidiModule.ts                  # Event-emitter wiring
├── ios/
│   ├── CadenzaMidiModule.swift           # CoreMIDI client, MIDI receive, device enumeration
│   └── CadenzaMidi.podspec
└── android/
    ├── build.gradle
    └── src/main/java/expo/modules/cadenzamidi/
        └── CadenzaMidiModule.kt          # MidiManager client, MIDI receive, device enumeration

src/
├── app/
│   ├── Shell.tsx                         # Existing — unchanged
│   ├── EditMode.tsx                      # UPDATE — insert MidiActivityDisplay (center) + prefs gear (right)
│   ├── PerformMode.tsx                   # Existing — unchanged
│   ├── MidiActivityDisplay.tsx           # NEW — subscribes to useMidiLastMessage, renders formatted string
│   └── PreferencesMenu.tsx               # NEW — full-screen Modal overlay, renders toggles
├── midi/
│   ├── MidiInputContext.tsx              # NEW — provider wiring native events → filter → emitter
│   ├── useMidiLastMessage.ts             # NEW — rAF-throttled hook returning the latest MidiMessage | null
│   ├── parser.ts                         # NEW — pure: Uint8Array → MidiMessage
│   ├── format.ts                         # NEW — pure: MidiMessage → abbreviated string
│   ├── filter.ts                         # NEW — pure: (msg, prefs) → boolean
│   ├── types.ts                          # NEW — MidiMessage, MidiDevice, MidiMessageType, etc.
│   └── platform.ts                       # NEW — typed platform adapter interface + no-op fallback
├── prefs/
│   ├── PreferencesContext.tsx            # NEW — provider, load-on-mount, in-memory state, save-on-change
│   ├── usePreferences.ts                 # NEW — hook returning { prefs, setPreference }
│   ├── schema.ts                         # NEW — preference keys + defaults + types (extensible)
│   └── storage.ts                        # NEW — AsyncStorage read/save, failure-safe
├── mode/                                 # Existing — unchanged
└── theme/
    └── colors.ts                         # UPDATE — add modal backdrop, switch track/thumb tokens

__tests__/
├── midi/
│   ├── parser.test.ts
│   ├── format.test.ts
│   ├── filter.test.ts
│   ├── MidiInputContext.test.tsx
│   └── useMidiLastMessage.test.tsx
├── prefs/
│   ├── storage.test.ts
│   ├── PreferencesContext.test.tsx
│   └── schema.test.ts
├── app/
│   ├── EditMode.test.tsx                 # UPDATE — add gear + display assertions
│   ├── MidiActivityDisplay.test.tsx      # NEW
│   └── PreferencesMenu.test.tsx          # NEW
└── (existing tests from 001 preserved)

__mocks__/
├── @expo/vector-icons.js                 # Existing
├── react-native-safe-area-context.js     # Existing
├── @react-native-async-storage/
│   └── async-storage.js                  # NEW — uses the library's bundled jest mock
└── modules/
    └── expo-cadenza-midi.js              # NEW — programmable mock (fires synthetic messages, simulates device changes)
```

**Structure Decision**: Option 1 (Single project), extended with a new `modules/` top-level directory for the local Expo native module (Expo's convention for `--local` modules). `src/midi/` and `src/prefs/` are new sibling directories under `src/`, matching the `src/mode/` / `src/theme/` pattern established in feature 001.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No principle violations. The entries below track **architectural shifts** that reviewers should see explicitly:

| Shift | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Leave Expo Go; add `expo-dev-client` and prebuild native projects | Platform MIDI APIs (CoreMIDI / `MidiManager`) require native code; Expo Go does not load custom native modules. | Staying in Expo Go would require an in-process JS MIDI implementation, which is not possible — these APIs only exist natively. Web MIDI API alone would abandon iOS/Android, which defeats the product. |
| Build a custom local Expo native module (`modules/expo-cadenza-midi`) instead of adopting a third-party wrapper (e.g., `@motiz88/react-native-midi`) | Principle II demands tight control of the MIDI hot path, and a future MIDI-output feature will want the same module to handle both directions with a single lifecycle. Starting with a custom module avoids a later migration off a third-party dep. | Third-party wrappers are available and would ship faster for this feature alone, but they couple us to a dependency whose maintenance we do not control, and they force a migration when output lands. The upfront cost (~a few hundred lines of Swift+Kotlin) is modest. |
| Scope: three coupled capabilities (MIDI subsystem + display + preferences) in one feature | The user-specified feature bundles them; the SysEx toggle is only meaningful when both the subsystem and a UI to reach the toggle exist. US1/US2/US3 staging keeps MVP shippable as US1 alone. | Splitting would force a "sub-feature" structure; the user specified these as one coherent unit and the P1/P2/P3 priority ordering already gives us incremental-delivery properties without branching. |

**Re-check after Phase 1 design**: evaluated against the data model, UI contract, research decisions, and quickstart. No new principle exposures surfaced:

- **Principle I** — failure handling pinned in data model (`Preferences` invariants #3–#4) and in research §4 (AsyncStorage fallback strategy). UI contract confirms no blocking user steps on failure.
- **Principle II** — research §1–§3 locks in a pure TS parse/filter/emit pipeline with synchronous, allocation-bounded dispatch. UI throttling lives in the hook (`useMidiLastMessage`), not the subsystem. `MidiInputSubscriber` invariants formalize listener-throws isolation.
- **Principle III** — trivially maintained; no audio synthesis anywhere in the design.
- **Principle IV** — `contracts/ui-surfaces.md` enumerates 11 test files covering parser, filter, format, context behavior, storage fallbacks, and every UI surface touched. Tests are written before their implementations per the tasks.md plan.
- **Principle V** — satisfied by the current branch/spec layout.
- **Principle VI** — gear icon sizing, Modal full-screen treatment, native `Switch` touch ergonomics, and redundant state signaling are all specified at the contract level.
- **Principle VII** — the preferences overlay contract includes a focus trap, initial focus target, and return-focus-on-close semantics. Switch state is conveyed by position + accompanying text + accessibility state, not by color alone.

**Gate result (post-Phase 1)**: PASS.
