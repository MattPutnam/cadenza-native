# Quickstart: MIDI Input, Activity Display, and Preferences System

**Feature**: `002-midi-input-and-preferences`
**Date**: 2026-04-19

This quickstart is the manual-verification companion to `/speckit-implement`. It covers the Dev Client build transition, automated test run, and end-to-end MIDI round-trip on at least one device.

## Prerequisites

- `npm install` has been run after the feature's dep additions.
- Xcode 15.4+ (iOS) and/or Android Studio with an API 34 AVD (Android).
- A MIDI source reachable by the target device: a USB MIDI controller, a Bluetooth MIDI device paired at the OS level, or a virtual MIDI port from a utility like macOS's IAC Driver or Android's `MidiScope`.

## One-time: switch to a Dev Client build

Expo Go does not load custom native modules. This feature adds one, so we transition:

```bash
# Generate ios/ and android/ projects (one-time; checked in)
npx expo prebuild

# iOS: build & run on a connected simulator or device
npx expo run:ios                        # any booted iOS sim
npx expo run:ios --device "iPhone 15"   # named sim
npx expo run:ios --device               # pick a physical device

# Android: build & run on the default-connected emulator or device
npx expo run:android
```

After the first Dev Client build, day-to-day cycles use `npm start` (Metro dev server) + opening the installed dev client on the device. Hot reload still works.

> **Note:** the old `npm run ios:iphone` / `ios:ipad` / `android:tablet` scripts from feature 001 aimed at Expo Go; they still work for code that doesn't touch MIDI but will show "No MIDI input" forever because the native module is absent. From this feature forward, prefer the `expo run:*` entry points above.

## Automated verification

```bash
npx jest                         # full suite — every test in __tests__/ must pass
npx tsc --noEmit                 # full typecheck — 0 errors
```

Both MUST be clean before manual smoke.

## Manual verification — acceptance scenarios

### US1 — See incoming MIDI activity

1. Launch the dev client (via `npm start`).
2. Connect a MIDI controller to the device (USB, or paired Bluetooth MIDI).
3. In Edit mode, confirm the header shows the idle placeholder (`"No MIDI input"`) in the center.
4. Play a note on the controller. Expect: the center text updates within an eyeblink to an abbreviated Note On line (e.g., `NoteOn ch 1  C4  v100`).
5. Play a rapid sequence of notes. Expect: the text tracks the latest message without visibly freezing.
6. Move a mod wheel or pedal to generate a CC stream. Expect: the text updates with Control Change lines; even during a dense sweep, individual values remain readable (throttle working).
7. Disconnect the controller. Expect: the readout stays on the last message it showed — no error, no crash. The app remains fully navigable.

### US2 — Toggle Ignore SysEx

1. Default is `ignoreSysEx` ON. Open preferences (gear icon) and toggle `ignoreSysEx` OFF.
2. From a MIDI utility (macOS: IAC + a sysex-sending app; Android: a virtual MIDI app), send a SysEx message.
3. Expect: the display shows a SysEx line (abbreviated, e.g., `SysEx (18 bytes)`).
4. Open preferences again. Expect: the overlay slides in full-screen with the title "Preferences" and two rows ("Ignore SysEx", "Ignore System Real-Time").
5. Toggle "Ignore SysEx" on. Expect: the switch animates to the ON position immediately; no save step needed.
6. Send another SysEx. Expect: the activity display does NOT show it. A subsequent Note On / CC MUST still appear normally.
7. Close the overlay (tap the × control in the overlay's top-left, or on Android use the system back gesture). Expect: the Edit view returns; the gear icon is refocused for keyboard users.

### US3 — Preferences persist across cold launches

1. With "Ignore SysEx" on (from US2), force-quit the app.
2. Relaunch the app via the dev client.
3. Open the preferences overlay. Expect: "Ignore SysEx" is still on — without any intermediate user action.
4. Additional: send a SysEx. Expect: it does NOT show in the display (the persisted preference is actually in effect, not just visually ticked).

### Clarified behavior — Ignore System Real-Time (default ON)

1. Connect a device or utility that sends MIDI Clock (e.g., a DAW with transport running). With a default first-time launch, `ignoreSystemRealTime` is ON.
2. Expect: Clock, Start, Stop, Continue, Active Sensing do NOT appear in the display. Notes / CC / Program Change MUST still appear.
3. Open the preferences overlay. Toggle "Ignore System Real-Time" OFF.
4. Expect: on the next arriving Clock (or Active Sensing) message, the display updates to show it — at a visibly high rate (throttled to ~60 Hz).

## Edge-case spot checks

- **Rotation in the preferences overlay**: rotate the device while the overlay is open. The overlay must relayout; both switch rows must remain fully visible and tappable.
- **Backgrounding with active MIDI**: send MIDI while the app is in the foreground, send it to background, return. The latest-visible message MUST either update to the current message or remain on the most recent pre-background message; the UI MUST NOT be frozen.
- **Listener-throws isolation** (covered by unit tests; spot-check via dev): hot-editing `MidiActivityDisplay` to throw in its render should not prevent the activity pipeline from continuing to dispatch to other listeners (future feature).
- **Cold launch with no prior storage**: delete the app and reinstall. First launch MUST show defaults (`ignoreSysEx` ON, `ignoreSystemRealTime` ON) in the preferences overlay, and the filter behavior MUST match from the first message onward.

## Troubleshooting

| Symptom                                                          | Likely cause                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Display stays on "No MIDI input" even with a controller sending  | Running in Expo Go, not the dev client. Rebuild via `npx expo run:ios` / `run:android`. |
| Bluetooth MIDI device doesn't appear                             | On Android 31+, grant `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT`. On iOS, pair in Settings → Bluetooth. |
| Gear icon opens but overlay appears blank                         | `<PreferencesProvider>` missing from `App.tsx`, or its storage is still loading. Check `isLoaded`. |
| Toggle visually flips but SysEx still appears in display          | Filter is reading a stale prefs snapshot. Verify `MidiInputContext` reads `prefs` live (not captured). |
| Display updates in tens-of-Hz thrash during a sweep              | `useMidiLastMessage` isn't actually coalescing via rAF. Check for a missing frame-schedule. |
| App crashes on disconnect                                        | Native module isn't tolerating a `kMIDIObjectRemoved` notification. Check iOS/Android listeners. |

## Release gate (per constitution)

> *"Any change to MIDI dispatch, trigger resolution, cue advance, or patch loading MUST be validated end-to-end against a physical MIDI device (or a recorded-fixture harness derived from one) before release."*

Manual verification against a physical MIDI device (or virtual port on the test machine) is a hard requirement for this feature. Simulator-only validation is insufficient because simulator MIDI is typically unavailable.
