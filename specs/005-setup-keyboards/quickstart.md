# Quickstart: Setup Tab — Keyboard Configuration

**Feature**: `005-setup-keyboards`
**Date**: 2026-04-22

Manual-QA walkthrough exercising every user story and the documented edge cases. Run against a dev-client build with the feature merged in.

---

## Prerequisites

- Dev client installed on an iPad / iPhone simulator AND on an Android phone / tablet emulator. Having at least one real USB-MIDI controller available for physical-device testing is a bonus.
- The app has either been freshly installed OR had its `cadenza.keyboards.v1` storage key cleared, so the first-launch state can be observed.
- Feature 002 (MIDI input + preferences), feature 003 (view navigation), and feature 004 (keyboard display component) are all expected to be working — this feature builds on them.

---

## US1 — Single keyboard: change the size

### Tablet

1. Cold-launch the app on an iPad (or iPad simulator).
2. From Edit mode, pick the **Setup** segment (if it's not already selected).
3. **Expect**: one Keyboard row is visible. The controls row at the top shows ONLY a Size dropdown reading "88 keys". Below the controls, the `<Keyboard>` visualization shows the full 88-key piano range (A0–C8).
4. **Expect NOT visible**: device dropdown, channel dropdown, nickname field, delete button.
5. Tap the Size dropdown. **Expect**: a dropdown with seven options — 25, 37, 49, 61, 73, 76, 88 — each labeled with its key count.
6. Select "61 keys". **Expect**: the dropdown closes, the controls row now reads "61 keys", and the keyboard visualization updates to the C2–C7 range.
7. Force-quit the app and relaunch. **Expect**: the size selection (61) persists.

### Phone

1. Cold-launch the app on an iPhone (or at a simulator width < 600 pt).
2. Pick the **Setup** view from the View dropdown in the Edit header.
3. **Expect**: one Keyboard card is visible. The card contains a Size dropdown only. NO `<Keyboard>` visualization is shown.
4. Tap the Size dropdown, pick "25 keys". **Expect**: the card's Size label updates to "25 keys".
5. Relaunch the app. **Expect**: "25 keys" persists.

---

## US2 — Multiple keyboards: device + channel + nickname

Prereqs for the richest test: connect two distinct MIDI input devices (say, "Roland A-49" and a second controller, or two virtual MIDI sources). Or use one device with a MIDI hub that exposes multiple channels on the same name.

### Adding a second keyboard

1. From the single-keyboard state, tap **+ Add Keyboard** at the bottom of the Setup view.
2. **Expect**: a second Keyboard row/card appears with the 88-key default. BOTH keyboards now show additional controls:
   - Device dropdown
   - Nickname text field
   - Delete button
3. **Expect**: no channel dropdown yet — no two keyboards share a device.

### Different devices (the simple case)

1. On Keyboard 1, tap the Device dropdown. **Expect**: the list includes your connected devices by name.
2. Select the first device (e.g., "Roland A-49").
3. On Keyboard 2, open the Device dropdown and select the second device.
4. **Expect**: no conflict warning anywhere.
5. Type a nickname for each (e.g., "Upper" and "Lower").
6. Relaunch the app. **Expect**: all four values (device + nickname × 2) persist.

### Same device (forces channel)

1. On Keyboard 2, change the Device dropdown to the SAME device already selected on Keyboard 1.
2. **Expect**: a Channel dropdown now appears on BOTH keyboards (channels 1–16). The defaults are chosen so no two keyboards share the same channel (e.g., Keyboard 1: channel 1, Keyboard 2: channel 2).
3. On Keyboard 2, open the Channel dropdown and select channel 1 (matching Keyboard 1).
4. **Expect**: both keyboards now show a visible warning — an amber icon plus a conflict banner reading roughly "Channel conflict: two keyboards on the same device and channel."
5. Change Keyboard 2's channel to 3. **Expect**: both warnings clear within one frame.
6. Relaunch the app. **Expect**: the channel selections (1 and 3) persist.

### No input detected

1. Disconnect all MIDI devices.
2. In the Setup view (with at least 2 keyboards still defined), tap any Device dropdown. **Expect**: the dropdown shows a single non-selectable entry "<No input detected>".
3. Reconnect one device. Reopen the Device dropdown. **Expect**: the new device name now appears.

### Nickname field

1. With the Nickname field for a Keyboard visible, type a 32-character nickname. **Expect**: the input accepts all 32 characters.
2. Try to type a 33rd character. **Expect**: input is blocked (maxLength enforced) or silently truncated to 32 (either is acceptable).
3. Clear the nickname to empty. **Expect**: the displayed label reverts to the default "Keyboard 1", "Keyboard 2", etc. The empty string is accepted without error.

---

## US3 — Disconnected device warnings

Prereq: complete US2 with a keyboard assigned to a real device. Nickname doesn't matter.

### Disconnect mid-session

1. Physically disconnect the device (unplug USB / disable Bluetooth).
2. On the Setup view's still-visible Keyboard that was assigned to that device, **expect** the Device dropdown anchor now carries a warning icon (amber). The device name is still shown as the selected value.
3. Reopen the Device dropdown. **Expect**: the disconnected device is still in the list (as the current selection), alongside any still-connected devices.

### Reconnect

1. Reconnect the device.
2. **Expect**: the warning icon on the Device anchor clears within half a second of the reconnect event. No user action needed.

### Cold launch without the device

1. Force-quit the app.
2. Leave the assigned device disconnected.
3. Relaunch the app. Navigate to Setup.
4. **Expect**: the Keyboard still shows the device name as selected, with the warning icon visible. The assignment was stored by name and survives the relaunch.

### Name collision (accepted limitation)

1. Connect two physically different devices that both report the SAME name at the OS level (e.g., two identical USB controllers).
2. Open the Device dropdown. **Expect**: only one entry for that name. This is a documented limitation — the app cannot distinguish identically-named devices.

---

## Edge-case spot checks

- **Delete the second-to-last keyboard**: with two keyboards, delete one. **Expect**: the remaining Keyboard reverts to the single-keyboard layout (device/channel/nickname/delete controls disappear).
- **Delete the last keyboard**: the delete button on the sole remaining Keyboard is either hidden OR visibly disabled. Tapping it (if present) does nothing.
- **Layout change mid-edit**: on an iPad, with the Size dropdown open, change from full-screen to 1/3 split (forcing phone layout). **Expect**: the dropdown may close automatically, but the underlying state (pending selections not yet committed) doesn't crash the view. Reopen and verify state is consistent.
- **Rapid add + delete**: tap Add, then immediately tap delete on the new Keyboard. **Expect**: ends in a clean single-keyboard state with no flash of an orphan row.
- **Rapid device-swap**: change Keyboard 1's device back and forth between two devices rapidly. **Expect**: the channel dropdown appears/disappears accordingly without leaving a stale channel selection (e.g., channel 2 set while the keyboard is solo on a device should not persist once the sibling moves off).
- **Storage corruption**: manually corrupt the `cadenza.keyboards.v1` AsyncStorage value (via a test harness or a dev tool) to invalid JSON. Relaunch the app. **Expect**: the app renders the default single-88 state, no crash, and a console warning about the load failure.

---

## Accessibility spot checks

- **Keyboard focus**: with an external keyboard, Tab through the controls on a Keyboard row. Each dropdown anchor, the nickname field, and the delete button receive focus in order, with a visible focus ring against the dark background.
- **Screen-reader labels** (not required per Principle VII but included for parity): enabling VoiceOver and tapping on the Device dropdown announces "Device, Roland A-49, button". Disconnected state announces "Device, Roland A-49, disconnected, button".
- **Color-blind safety**: the warning icon is shape + color (an exclamation inside a triangle), and the conflict banner also carries text — no information conveyed by color alone.

---

## Completion criteria

The feature is ready to merge when:

- All test suites pass (`npm test`).
- `npx tsc --noEmit` reports no errors.
- The walkthrough above passes on:
  - iPad or iPad simulator
  - iPhone or iPhone simulator
  - Android tablet emulator
  - Android phone emulator
- WCAG AA contrast verified for any new token (`warning`) against `surface` and `surfaceElevated`.
- The `MidiInputContext` is confirmed unchanged — no alterations to the MIDI hot path.

---

## Troubleshooting

| Symptom                                                          | Likely cause                                                                  |
|------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Setup view is blank (no keyboards)                               | `isLoaded` never flips to true. Check that `loadKeyboards()` resolves (even on miss it must resolve). |
| Clicking "Add Keyboard" adds two                                 | Double-tap bug. Ensure `onPress` isn't wired to `onPressIn`/`onPressOut` as well. |
| Keyboards appear on phone but `<Keyboard>` visualization also shows | `useLayoutMode()` not consulted, or the layout branch is wrong. Check the KeyboardRow vs KeyboardCard dispatch. |
| Conflict warning shows but `detectConflicts` says no             | Value equality bug (e.g., comparing strings vs numbers for channel). Ensure channel is stored as a number. |
| Device dropdown shows an empty "Nothing" entry                   | `<No input detected>` placeholder being treated as an option. Ensure the placeholder is non-selectable. |
| Changing size on tablet doesn't update the keyboard visualization | `<Keyboard />`'s `low/high` props not recomputed. Ensure `sizeToRange` is called on each render. |
| Nickname empty → displays "null" instead of default              | Empty string / null handling inconsistent. Normalise empty to `null` at the store boundary. |
