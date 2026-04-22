# Feature Specification: Setup Tab — Keyboard Configuration

**Feature Branch**: `005-setup-keyboards`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "In the setup tab, users specify the keyboards they will use. The app starts with one 88-key keyboard defined. Users can add, edit, and delete keyboards. Reordering is out of scope for now. If there is only one keyboard defined, the only parameter to change is the range. There is a dropdown with all of the common keyboard sizes from 25 to 88 key. Custom sizes are out of scope for now. New keyboards are 88-key by default. When there are multiple keyboards, they need to be differentiated by input connection, so a dropdown with all available input MIDI devices is shown. If there are no devices connected, the dropdown only shows '<No input detected>'. If the user has previously selected a device but it is not currently connected, it is still shown and selected, but with a warning icon. If two different keyboards have the same device selected, then there is also a MIDI channel dropdown. If two different keyboards have the same device and channel selected, there is a warning given. When there are multiple keyboards, there is also a text field to give them an optional nickname. On tablet, keyboards are shown with the Keyboard component, and the controls in a row across the top. On phone, no Keyboard component is shown and the controls are grouped in a card component. MIDI devices are stored and identified by name, not device ID, as users may own multiple of the same MIDI interfaces."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single keyboard: change the keyboard's size (Priority: P1)

A performer running Cadenza for the first time sees a single 88-key keyboard pre-defined in the Setup tab. If their hardware is smaller (say a 61-key controller), they open a single size dropdown and pick the right size — the keyboard visualization (on tablet) updates immediately to the matching range, and their selection persists across app restarts.

**Why this priority**: This is the simplest and most common path. Most hobbyists use one keyboard. The default 88-key assumption is wrong for a lot of users, so this path must be trivial and discoverable on first launch. Nothing else in the product makes sense until the app's model of "what keyboard is plugged in" matches reality.

**Independent Test**: Cold-launch the app (or clear storage), navigate to the Setup tab, open the size dropdown on the single keyboard, select a smaller size (e.g., 61-key), relaunch the app, verify the selection is preserved. On tablet, also verify the on-screen keyboard visualization matches the selected size's standard range.

**Acceptance Scenarios**:

1. **Given** a cold-launched app with no stored setup, **When** the user opens the Setup tab, **Then** exactly one keyboard is shown, it is labeled or visually represented as "88-key", and no device or channel controls are visible.
2. **Given** the single-keyboard state, **When** the user opens the size dropdown, **Then** the dropdown lists the seven standard sizes — 25, 37, 49, 61, 73, 76, 88 — each labeled with its key count.
3. **Given** the single-keyboard state on a tablet, **When** the user selects a new size, **Then** the on-screen keyboard visualization updates to the matching range within one frame and persists across app restarts.
4. **Given** the single-keyboard state on a phone, **When** the user selects a new size, **Then** the card's displayed size label updates to the new size and persists across app restarts. No on-screen keyboard visualization is shown on phone.
5. **Given** the single-keyboard state, **When** the user looks at the keyboard's controls, **Then** only the size dropdown is visible — no device dropdown, no channel dropdown, no nickname field, no warning icons.
6. **Given** the single-keyboard state, **When** the user inspects delete affordances, **Then** the delete action for the sole keyboard is either hidden or disabled (the app MUST always have at least one keyboard defined).

---

### User Story 2 — Multiple keyboards: differentiate by device and channel (Priority: P1)

A working keyboardist uses two or more MIDI controllers on stage (e.g., a 61-key upper manual and an 88-key lower manual). In the Setup tab they add a second keyboard and assign each one to its physical MIDI input device. If the two keyboards happen to come from the same device (a single USB hub with multiple keyboard inputs split on MIDI channels), they additionally pick a MIDI channel per keyboard so the app can route notes correctly. They give each keyboard a short nickname so the rest of the app's surfaces (Patches, Cues, future features) can refer to them by a memorable name.

**Why this priority**: This is the multi-keyboard workflow that justifies the Setup tab existing at all. The whole point of the feature is to let the app distinguish "notes from the lower manual" from "notes from the upper manual" so that patch and cue assignments can be per-keyboard. Without this, any multi-keyboard setup is ambiguous and the rest of the product can't build on it.

**Independent Test**: Cold-launch, add a second keyboard in the Setup tab, assign each keyboard to a different MIDI input device (or the same device on different channels), give each a nickname, relaunch the app, verify all selections persist. Verify the UI flags same-device-same-channel as a conflict warning.

**Acceptance Scenarios**:

1. **Given** the single-keyboard state, **When** the user taps "Add Keyboard", **Then** a second keyboard appears with the 88-key default, and both keyboards now show device dropdowns and nickname fields.
2. **Given** two keyboards, no devices yet assigned, with two real MIDI input devices currently connected (e.g., "Roland A-49" and "Arturia KeyLab 61"), **When** the user opens either keyboard's device dropdown, **Then** the dropdown lists both device names; "<No input detected>" is NOT shown because real devices exist.
3. **Given** two keyboards with no currently-connected devices, **When** the user opens either device dropdown, **Then** the dropdown shows only "<No input detected>" as a single placeholder entry that cannot be selected as a real device.
4. **Given** two keyboards that are both assigned to the same device (say "Roland A-49"), **When** the user looks at either keyboard, **Then** a MIDI channel dropdown is now visible next to the device dropdown on BOTH keyboards, each listing channels 1–16.
5. **Given** two keyboards both assigned to device "Roland A-49" with keyboard A on channel 1 and keyboard B on channel 2, **When** the user looks at either keyboard, **Then** no conflict warning is shown.
6. **Given** two keyboards both assigned to device "Roland A-49" and both set to channel 1, **When** the user looks at either keyboard, **Then** a conflict warning is visible on both keyboards clearly indicating that two keyboards share the same device AND channel.
7. **Given** the multi-keyboard state, **When** the user types a nickname into a keyboard's nickname field, **Then** the nickname persists across app restarts and no validation error is raised (nicknames are optional free-form text).
8. **Given** the multi-keyboard state on a tablet, **When** the Setup tab renders, **Then** each keyboard shows the `<Keyboard>` component (from feature 004) spanning its size's range, with the size / device / channel / nickname controls laid out in a row across the top of that keyboard's block.
9. **Given** the multi-keyboard state on a phone, **When** the Setup tab renders, **Then** each keyboard is shown as a card containing only the controls (size / device / channel / nickname) and NO `<Keyboard>` visualization.
10. **Given** the multi-keyboard state, **When** the user deletes the second-to-last keyboard (leaving one), **Then** the remaining keyboard's device / channel / nickname controls disappear and the UI reverts to the single-keyboard layout.

---

### User Story 3 — Persisted device is not currently connected (Priority: P2)

A user sets up two keyboards at home, then travels to a rehearsal and launches the app with only one of those two devices physically connected. The app remembers the assignment by the device's **name** (not an opaque ID) so that reconnecting the same make/model of device later restores the routing automatically. Missing devices are clearly flagged in the UI without blocking the user.

**Why this priority**: This is the fault-tolerant behavior that makes the Setup tab durable across real-world conditions (missing cables, different venues, swapped interfaces). P2 because the single-connected-venue case already works via US1 / US2; this story polishes the degraded-device scenario without adding a new core capability.

**Independent Test**: In a running session with keyboards assigned, unplug one MIDI device, reopen the Setup tab, verify the assignment persists and the offending keyboard shows a warning icon on its device dropdown. Reconnect the device (either during the session or on next launch) and verify the warning clears automatically.

**Acceptance Scenarios**:

1. **Given** a keyboard with device "Roland A-49" assigned, the device was connected when the selection was made, but is NOT currently connected, **When** the user opens the Setup tab, **Then** the device dropdown still shows "Roland A-49" as the selected value (not replaced with "<No input detected>") and the dropdown visually carries a warning icon indicating the device is not currently connected.
2. **Given** the same keyboard in the warning state, **When** the device "Roland A-49" is connected (either via USB plug-in or Bluetooth pairing during the session), **Then** the warning icon clears on next UI refresh without the user needing to re-select the device.
3. **Given** two instances of an identically-named device ("Roland A-49") can both be stored over the user's lifetime without conflict, **When** the user connects any one of them later, **Then** the stored assignment matches by name and resumes without a re-pairing step.
4. **Given** a keyboard's device dropdown is in the warning state, **When** the user opens the dropdown, **Then** the previously-selected device appears in the list of options even though it is not currently connected, alongside any currently-connected devices.

---

### Edge Cases

- **Delete the last keyboard**: blocked — the app MUST always have at least one keyboard. The delete control is hidden or disabled on the sole keyboard.
- **Go from 2 keyboards back to 1**: deleting one of two keyboards removes the device / channel / nickname controls from the remaining keyboard; it becomes the single-keyboard layout again. Its size stays as set.
- **Three or more keyboards on the same device + same channel**: the conflict warning surfaces on all N conflicting keyboards, not just two.
- **Two identically-named devices currently connected simultaneously** (rare but possible if the user has two instances of the same model plugged in): the dropdown shows the name once; the app cannot distinguish them by name alone. This is accepted as a limitation — identification is by name per the feature description. The warning here is out of scope.
- **Device connect/disconnect while the Setup tab is open**: the device dropdown must update live as devices come and go. Open dropdowns MAY close on such events; closed dropdowns simply show the new contents on next open.
- **Nickname uniqueness**: nicknames are NOT required to be unique across keyboards. Two keyboards both nicknamed "Upper" is allowed.
- **Nickname character limits**: reasonable maximum (around 32 characters) to avoid unreadable UIs. Input over that length is truncated or prevented.
- **Size change that shrinks the range**: purely visual on tablet; the selection itself is a lookup into a fixed size → range table.
- **Layout mode change (tablet ↔ phone) while editing a keyboard**: current state (size, device, channel, nickname) must survive the layout swap without loss.
- **Connecting a device whose name exactly matches "<No input detected>"**: treat the placeholder as a UI affordance, never as a selectable value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Setup tab MUST host a list of user-defined Keyboards. On first launch (no persisted setup), the list MUST contain exactly one Keyboard with a size of 88.
- **FR-002**: The user MUST be able to add a new Keyboard. New Keyboards MUST default to a size of 88 and no device / channel / nickname assignments.
- **FR-003**: The user MUST be able to delete any Keyboard as long as it is not the last remaining Keyboard. The last remaining Keyboard is undeletable.
- **FR-004**: The user MUST be able to edit a Keyboard's size by selecting a value from a dropdown of standard sizes: **25, 37, 49, 61, 73, 76, 88** keys. Each size maps to a fixed MIDI note range (see §Key Entities). Custom sizes are out of scope.
- **FR-005**: When exactly one Keyboard exists, ONLY the size dropdown is visible for that Keyboard. No device dropdown, no channel dropdown, no nickname field.
- **FR-006**: When two or more Keyboards exist, EACH Keyboard MUST additionally show a device dropdown and a nickname text field.
- **FR-007**: The device dropdown MUST list the names of all currently-connected MIDI input devices. When no devices are currently connected AND the Keyboard has no previously-selected device, the dropdown MUST show only the placeholder entry "<No input detected>".
- **FR-008**: When a Keyboard has a previously-selected device that is not currently connected, the dropdown MUST still display the device name as the selected value, and the dropdown MUST carry a visible warning icon indicating the disconnected state.
- **FR-009**: The device dropdown MUST list a previously-selected-but-disconnected device alongside currently-connected devices when opened, so the user can retain, change, or clear the selection.
- **FR-010**: When two or more Keyboards have the SAME device assigned, a MIDI channel dropdown MUST appear on EACH of those Keyboards, listing channels 1 through 16. When a Keyboard's device is unique across all Keyboards, no channel dropdown is shown for that Keyboard.
- **FR-011**: When two or more Keyboards share BOTH the same device AND the same channel, a conflict warning MUST be shown on each of the conflicting Keyboards.
- **FR-012**: The user MUST be able to enter a free-form optional nickname for each Keyboard when two or more Keyboards are defined. Nicknames MUST be persisted and MUST NOT be required to be unique.
- **FR-013**: The Keyboard list MUST persist across app launches. Persisted fields per Keyboard: size, selected device name (nullable), MIDI channel (nullable), and nickname (nullable). Device assignments MUST be stored by device **name**, not by a device ID or vendor identifier, so the same make/model of hardware across sessions matches the stored selection.
- **FR-014**: On a tablet-class layout, EACH Keyboard MUST be rendered with the `<Keyboard>` component (from feature 004) showing its size's MIDI range, with its controls laid out in a row across the top of that Keyboard's block.
- **FR-015**: On a phone-class layout, the `<Keyboard>` component is NOT rendered. Instead, each Keyboard is shown as a card containing its controls grouped together.
- **FR-016**: All controls MUST be reachable via the existing tablet/phone layout heuristic (the width-based layout-mode used by the rest of the app). Rotation or split-view resize must not lose edit state.
- **FR-017**: Device-connect and device-disconnect events that occur while the Setup tab is open MUST update the device dropdown's options within the same session (without requiring the user to leave and re-enter the tab).
- **FR-018**: Reordering of Keyboards is explicitly OUT OF SCOPE for this feature. The display order is the order of creation.

### Key Entities

- **Keyboard**: A user-defined entry in the Setup tab representing one physical MIDI controller. Attributes:
  - `id`: a stable identifier (opaque to the user, used internally for list management).
  - `size`: one of 25, 37, 49, 61, 73, 76, 88. Determines the MIDI range.
  - `deviceName`: string or null. The display name of the assigned MIDI input device as reported by the platform at the time of selection.
  - `channel`: integer 1–16 or null. Only meaningful when two or more Keyboards share `deviceName`.
  - `nickname`: free-form string or null. Shown only in the multi-keyboard UI.

- **Keyboard Size → Range mapping** (fixed, per the standard layout of each controller class):

  | Size | MIDI Low | Low Note | MIDI High | High Note |
  |------|----------|----------|-----------|-----------|
  | 25   | 48       | C3       | 72        | C5        |
  | 37   | 48       | C3       | 84        | C6        |
  | 49   | 36       | C2       | 84        | C6        |
  | 61   | 36       | C2       | 96        | C7        |
  | 73   | 28       | E1       | 100       | E7        |
  | 76   | 28       | E1       | 103       | G7        |
  | 88   | 21       | A0       | 108       | C8        |

  All low and high notes above are white keys, which satisfies the `<Keyboard>` component's contract from feature 004.

- **MIDI Input Device (runtime)**: A MIDI input currently or previously exposed by the platform. For this feature, a device is identified to the user and to persistence by its display name string. Device IDs, vendor identifiers, and platform-specific tokens are not part of the persisted model.

- **Conflict**: A detected condition where two or more Keyboards share the same `deviceName` AND the same `channel`. The UI surfaces this as a warning; it does not prevent saving.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-launch user can open the Setup tab, change the single keyboard's size to any of the seven standard sizes, close the app, reopen it, and see the size persisted — in under 30 seconds of hands-on time.
- **SC-002**: A user who adds a second keyboard and assigns each to a distinct MIDI device can complete the full routing (size + device + nickname on each) in under 60 seconds of hands-on time, assuming both devices are currently connected.
- **SC-003**: When two keyboards are configured on the same device and the same channel, the conflict warning appears on both keyboards within one visual frame of the conflict being created or detected, and clears within one frame of the conflict being resolved (by changing device or channel on either keyboard).
- **SC-004**: When a previously-assigned device is disconnected, the warning icon on that keyboard's device dropdown appears within 500 ms of the disconnect event, and clears within 500 ms of the device reconnecting.
- **SC-005**: 100% of Keyboard state — size, device name, channel, nickname — survives an app cold restart with byte-for-byte fidelity.
- **SC-006**: On a tablet at any supported width (≥ 600 pt), the `<Keyboard>` component from feature 004 renders for every Keyboard without visual overlap with its controls row, and without clipping at the top or bottom.
- **SC-007**: On the smallest supported phone width (320 pt portrait), every control (size, device, channel, nickname) is reachable and not truncated; the card layout scrolls vertically as needed to fit.
- **SC-008**: Deleting a keyboard removes its state from storage within one frame; re-launching the app shows the remaining keyboards unchanged.

## Assumptions

- **Fixed size → range mapping**: each of the seven standard sizes maps to exactly one MIDI range (see Key Entities table). The user cannot shift the range of a given size (e.g., Fatar-style 61-key E1–E6 is not offered). If that control is needed later, it will be a follow-on feature.
- **Single-keyboard routing is implicit**: a single keyboard accepts notes from all currently-connected devices on all channels. No device or channel dropdown is shown because no routing choice is needed.
- **Multi-keyboard routing is explicit**: as soon as a second keyboard exists, the first keyboard's device assignment becomes a required choice for the app to distinguish sources. The user is responsible for picking it; the app may start that Keyboard with no device assigned (prompting the user to fix it before the Setup is "complete").
- **Channel dropdown is triggered by shared device**: it appears only when two or more Keyboards share the same device. When a Keyboard is alone on its device, no channel dropdown is shown (implicit: "all channels from this device").
- **"Omni" is not exposed as a channel value in this feature**: when the channel dropdown appears (multiple Keyboards on one device), the user picks a specific 1–16 channel. The single-keyboard-per-device case implicitly behaves as Omni without exposing that as a user-selectable value.
- **Device identification is by name**: two physically different devices with the same name (e.g., two identical "Roland A-49" units plugged in at once) are indistinguishable to this feature. This is an explicit limitation.
- **Conflict warnings do not block save**: the user can have a same-device-same-channel conflict and the state still persists. The warning is an advisory, not a gate. The rest of the product (Patches, Cues) may later gate on it, but that is out of scope here.
- **The Setup tab is a passive configuration surface**: configuring a Keyboard does not by itself change MIDI routing behavior elsewhere in the app. Consumers (Patches, Cues, future routing logic) will read this configuration. Integrating the Setup output into runtime MIDI routing is OUT of scope for this feature — though `MidiInputContext` may need to expose a device-list hook for the Setup UI; that is a plan-level concern.
- **Nicknames have a reasonable length cap**: approximately 32 characters. Long nicknames are visually truncated with an ellipsis in tight layouts.
- **Storage is local-only**: the Keyboard list lives on the device. No cloud sync in scope.
