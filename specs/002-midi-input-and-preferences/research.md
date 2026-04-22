# Phase 0 Research: MIDI Input, Activity Display, and Preferences System

**Feature**: `002-midi-input-and-preferences`
**Date**: 2026-04-19

All of this feature's key decisions are locked in here. No `NEEDS CLARIFICATION` markers remain after this document.

## 1. Platform MIDI access: custom local Expo module

**Decision**: Build a local Expo native module, `modules/expo-cadenza-midi`, wrapping **CoreMIDI** on iOS (Swift) and the Android MIDI API (`MidiManager`) on Android (Kotlin). Exposed to JS as a typed facade with two responsibilities: (1) emit `onDeviceChange` events when devices appear/disappear, and (2) emit `onMessage` events for every inbound MIDI message, with `{ deviceId, bytes: Uint8Array, timestamp }`. No filtering, parsing, or throttling happens in the native layer.

**Rationale**:

- **Principle II (Real-Time MIDI Path Integrity)** — keeping the native layer minimal (just a bridge) and doing parse/filter in JS gives us one well-tested pipeline to optimize. A wrapper library's internal parse/filter choices would be opaque and potentially wrong for our needs.
- **Forward compatibility with MIDI output** — the same module will gain `sendMessage(deviceId, bytes)` in a later feature. Ownership of the module means that extension is additive, not a migration.
- **Expo compatibility** — a local Expo module autolinks into both iOS and Android via the Expo modules build system, stays type-safe via `expo-modules-core`'s generated bindings, and integrates with `npx expo run:ios` / `run:android` cleanly.

**Alternatives considered**:

- **`@motiz88/react-native-midi`** or other third-party wrappers — faster to adopt for input-only, but couples us to a dependency whose release cadence we do not control and whose API we would have to wrap anyway to stay platform-neutral per the constitution. A later MIDI-output feature would almost certainly force a migration.
- **Web MIDI API only** — only works on web; abandons iOS/Android, which defeats the product.
- **Staying in Expo Go with no MIDI** — infeasible: platform MIDI requires native code.

**Side effects of this decision**:

- The project leaves Expo Go for day-to-day dev. We install `expo-dev-client`, run `npx expo prebuild` to generate `ios/` and `android/` directories, and use `npx expo run:ios` / `run:android` (or EAS Build for shareable dev clients). The Metro dev server + hot reload continues to work.
- `app.json` gains the `expo-dev-client` plugin, Android `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` permissions (for BLE MIDI on API 31+) and the `android.hardware.usb.host` feature, and iOS `NSBluetoothAlwaysUsageDescription`.

## 2. MIDI parse/filter/format layer: pure TypeScript

**Decision**: Three pure, tree-shakeable modules in `src/midi/`:

- `parser.ts` — `parseMidiMessage(bytes: Uint8Array): MidiMessage` returning a discriminated union.
- `filter.ts` — `shouldDeliver(msg: MidiMessage, prefs: Preferences): boolean`, O(1).
- `format.ts` — `formatMidiMessage(msg: MidiMessage): string`, returns the abbreviated one-line display string.

**Rationale**: Pure functions are trivial to unit-test exhaustively (Principle IV), and the hot path stays synchronous and allocation-light (Principle II). A discriminated union on `MidiMessage.type` gives TypeScript an exhaustiveness check across parser, filter, and format — if a new message type is added, the compiler flags every switch that hasn't handled it.

**Alternatives considered**:

- A single class-based `MidiMessage` with methods (`.isSysEx()`, `.format()`) — more object-heavy and harder to keep allocation-free; rejected for hot-path reasons.
- Using a library like `midi-message-parser` or similar — drags a dependency in for ~50 lines of code we can own and test ourselves. Rejected.

## 3. Subscription model: pub/sub in a React Context, throttled hook for UI

**Decision**: `MidiInputContext` owns a small listener list (`Set<(msg: MidiMessage) => void>`). Native events → parser → filter → `listener(msg)` for each subscriber, synchronously. The UI subscribes via `useMidiLastMessage()`, which internally uses `requestAnimationFrame` to coalesce updates — multiple messages within a single frame result in one `setState`. The coalesced result is the LATEST message received in that frame.

**Rationale**:

- Keeps the hot path (listener notification) synchronous and lock-free.
- Moves the UI-side throttling out of the subsystem so non-UI subscribers (future: cue-advance triggers, recording features) receive every message.
- `requestAnimationFrame` naturally aligns with the display refresh rate (typically 60 Hz on tablets, 120 Hz on iPad Pro) — readability stays good regardless of device.

**Alternatives considered**:

- **`EventEmitter3`** or Node's `EventEmitter` — adds a dep or a shim without buying us anything over a plain `Set`. Rejected.
- **Zustand** or another external store — overkill for a single listener list and a last-message pointer. Rejected.
- **Throttle at the subsystem level (e.g., 20 Hz cap for everyone)** — would starve downstream features that need every message. Rejected.

## 4. Preferences state + persistence: React Context + AsyncStorage, failure-safe

**Decision**: `PreferencesContext` provides `{ prefs, setPreference, isLoaded }`. On mount, the provider reads from `AsyncStorage` under the key `cadenza.preferences.v1`. Until that load resolves, the provider serves default values and `isLoaded` is `false`. Consumers may render against defaults during load; the `MidiInputContext` defers first subscription until `isLoaded === true` so the subsystem does not start with incorrect filters. Subsequent calls to `setPreference` update the in-memory value synchronously and persist to `AsyncStorage` asynchronously.

**Rationale**:

- `AsyncStorage` is the canonical, Expo-supported k/v store for non-secret JSON. It is async-only (forcing us to think about load ordering) and has no size constraint that matters for our payload.
- Deferring the MIDI subscription until prefs are loaded avoids a race where SysEx filtering is accidentally OFF for the first few ms.
- Catch-and-log on read failure → fall back to defaults; keep going.
- Catch-and-log on write failure → the in-memory change is still effective for the session; next write attempt will retry.

**Alternatives considered**:

- **`expo-secure-store`** — keychain-backed, ~2KB per entry, slower. Preferences are not secrets; overkill. Rejected.
- **`react-native-mmkv`** — very fast, but adds a native dep. Over-engineering for a handful of booleans. May be revisited if/when the preferences payload becomes large or performance-sensitive.
- **File via `expo-file-system`** — workable but more manual (path construction, JSON encoding, atomic writes). AsyncStorage already solves this. Rejected.
- **Eager load at native layer** — would require the native module to parse the JSON and expose prefs, duplicating responsibility. Rejected.

## 5. Preferences schema: extensible key-based registry

**Decision**: `src/prefs/schema.ts` exports a single `PREFERENCES_SCHEMA` object keyed by preference name. Each entry has `{ key, default, type }`. The schema is the source of truth; the `Preferences` type is derived from it. Adding a preference in a future feature is a single-place change.

```ts
// conceptual shape
export const PREFERENCES_SCHEMA = {
  ignoreSysEx: { default: false, type: 'boolean' as const },
  ignoreSystemRealTime: { default: true, type: 'boolean' as const },
};
export type Preferences = { [K in keyof typeof PREFERENCES_SCHEMA]: ... };
```

**Rationale**:

- FR-016 requires the menu to be extensible without restructuring; a registry makes the UI loop over schema entries rather than hard-coding a list.
- Deriving the `Preferences` type from the schema enforces single-source-of-truth at compile time.

**Alternatives considered**:

- Inline list in `PreferencesMenu.tsx` — convenient for two entries, brittle for ten. Rejected.
- External JSON schema file — no type safety, and we don't need runtime validation at our scale. Rejected.

## 6. Preferences UI presentation: full-screen React Native `Modal`

**Decision**: `PreferencesMenu` is rendered as a `Modal` from `react-native` with `animationType="slide"`, `presentationStyle="fullScreen"`, and `transparent={false}`. The modal renders its own top bar containing a title and a close (×) control. Android back button is handled via the modal's `onRequestClose`.

**Rationale**:

- The `Modal` primitive handles focus trap, back-button, keyboard, and safe-area concerns natively. Using a custom overlay view would re-implement all of these poorly.
- The full-screen treatment matches the clarified UX (Clarifications §2).
- `animationType="slide"` is the iOS + Android convention for full-screen sheets and requires no extra library.

**Alternatives considered**:

- **`@gorhom/bottom-sheet`** or similar — only relevant for the bottom-sheet variant we rejected in clarification. Not needed.
- **`react-navigation`'s modal screens** — we don't have navigation yet; installing it for one modal is over-engineering. When we do add navigation (for e.g. song/cue editors), we can revisit whether to migrate the preferences screen.

## 7. Toggle control: React Native `Switch`

**Decision**: Use the built-in `Switch` from `react-native` for each preference toggle, with `trackColor` and `thumbColor` pulled from `theme/colors.ts`. Toggle state is conveyed by switch thumb position (native), accompanying label text ("On"/"Off"), and `accessibilityState={{ checked }}`.

**Rationale**:

- Native switches are finger-sized out of the box on both platforms, so touch-target compliance is automatic.
- Native platform rendering (including keyboard focus ring on web) is free.
- Redundant visual/text state conveyance satisfies Principle VII's "not by color alone" rule.

**Alternatives considered**:

- Custom `Pressable` toggle — more code to match platform conventions; rejected.
- `@react-native-picker/picker` or a segmented control — semantically wrong for boolean prefs. Rejected.

## 8. Gear icon: `@expo/vector-icons` Ionicons `settings-outline`

**Decision**: Reuse the existing `@expo/vector-icons` dependency (already installed in feature 001) and render an Ionicons `settings-outline` glyph for the preferences entry point on the right of the Edit header. Wrapping the icon in a `Pressable` with explicit `hitSlop` gives a ≥44pt/48dp tap area independent of the glyph size.

**Rationale**:

- No new dependency; visually consistent with the existing close glyph in Perform mode.
- `settings-outline` is a universally-recognizable gear glyph.

**Alternatives considered**: Material icons, Feather, Heroicons — all available inside `@expo/vector-icons` but Ionicons is already in use. No reason to diversify.

## 9. Jest mocking strategy for the native module

**Decision**: Provide a manual Jest mock at `__mocks__/modules/expo-cadenza-midi.js` that exposes:

- `subscribeToMessages(callback)` — returns an unsubscribe fn; no automatic firing.
- A test-only `__fireMessage(bytes, deviceId?, timestamp?)` that synchronously invokes all registered callbacks — lets tests inject messages.
- `observeDevices(callback)` + a test-only `__fireDeviceChange(event)`.

The real module is imported by the JS facade (`modules/expo-cadenza-midi/index.ts`). Jest's `moduleNameMapper` (in `package.json` → `jest`) maps the facade to the mock for tests.

**Rationale**:

- Tests drive arbitrary MIDI traffic (note on, CC, SysEx, Clock) without needing a connected device.
- Device-change events and per-device messages are simulated directly.
- No native code runs under Jest; all coverage of parse/filter/format is platform-agnostic.

**Alternatives considered**:

- `jest.mock()` inline per test — works but requires duplicating the mock shape everywhere. A shared manual mock is cleaner.
- Full integration tests on a simulator — valuable but not available in Jest; relegated to the quickstart manual-verification steps.

## 10. Display throttle implementation: `requestAnimationFrame` coalescing

**Decision**: `useMidiLastMessage` keeps the most recent message in a ref (`pendingRef.current = msg`) on every incoming message. Exactly once per frame (via `requestAnimationFrame`), it promotes the ref value to state via `setState(pendingRef.current)` and schedules the next frame. If no new message arrived during a frame, no state update occurs.

**Rationale**:

- Zero dependency overhead.
- Naturally adapts to the device's display refresh rate.
- Guarantees at most one re-render per frame of the `MidiActivityDisplay` component, regardless of message storm intensity.

**Alternatives considered**:

- `setTimeout`/`setInterval` throttling — tick rate unrelated to display refresh; rejected.
- `lodash.throttle` — adds lodash for one function. Rejected.
- `useSyncExternalStore` with a selector — elegant but requires reimplementing the same rAF coalescing logic inside the subscriber. Small complexity win elsewhere, not worth it here.

## Summary

All technology and design decisions are locked:

- Custom local Expo native module for CoreMIDI / Android MIDI access, with a Dev Client build shift.
- Pure TS `parser` / `filter` / `format` on top.
- React Context–based `MidiInputContext` with listener set + rAF-coalesced hook for the UI.
- React Context–based `PreferencesContext` with `AsyncStorage` persistence, failure-safe.
- Schema-driven preferences registry for easy extension.
- Full-screen `Modal` for the preferences UI, native `Switch` for toggles, Ionicons gear glyph for the entry point.
- Shared manual Jest mock for the native module so tests drive arbitrary MIDI traffic.

No `NEEDS CLARIFICATION` remains.
