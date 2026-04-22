# Feature Specification: MIDI Input, Activity Display, and Preferences System

**Feature Branch**: `002-midi-input-and-preferences`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Take MIDI input. Create a module that connects to all detected MIDI input devices and listens to all incoming messages. It should have an option to ignore System Exclusive (sysex) messages. Then create a React component that subscribes to input messages and displays the last received message in an abbreviated format, and put it in the center of the edit mode header. Create a preferences system with a preferences menu opened via an icon on the right side of the edit mode header."

## Clarifications

### Session 2026-04-19

- Q: Should System Real-Time MIDI messages (Clock `0xF8`, Start/Stop/Continue `0xFA`–`0xFC`, Active Sensing `0xFE`, System Reset `0xFF`) appear in the activity display? → A: Add a second preference ("Ignore System Real-Time") alongside "Ignore SysEx", defaulting to ON (ignore).
- Q: How is the preferences menu presented on each form factor? → A: Full-screen overlay on both tablet and phone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See incoming MIDI activity in real time (Priority: P1)

A keyboardist plugs in a MIDI controller (or an already-connected device sends a message) and immediately sees a concise readout of the most recent MIDI message in the center of the Edit-mode header. The readout confirms the app is receiving MIDI and shows what the device is sending — useful for diagnosing wiring issues, verifying channel assignments, and sanity-checking controller behavior before a session.

**Why this priority**: Without any indication that MIDI is flowing into the app, every other MIDI feature is impossible to validate. This is also the shortest path from "nothing" to "proof of life" for the MIDI subsystem as a whole.

**Independent Test**: Connect a MIDI controller. In Edit mode, press a key on the controller. Verify the header's central readout updates to show an abbreviated description of that Note On (message type, channel, note name, velocity). Press keys repeatedly and verify the readout tracks the latest message. Unplug the controller and verify the readout simply stops updating rather than crashing or freezing.

**Acceptance Scenarios**:

1. **Given** a MIDI controller is connected and the app is in Edit mode with no messages yet received, **When** the user plays a note on the controller, **Then** the center of the header updates within perceived-instant time to show an abbreviated description of the Note On, including at minimum the message type, MIDI channel, and the two primary data values (note + velocity).
2. **Given** the app has been receiving messages and is currently showing one, **When** a new message arrives, **Then** the display updates to show the newer message (the older one is no longer visible).
3. **Given** the app is in Edit mode and no MIDI device is connected or no messages have been received, **When** the user looks at the header, **Then** the central area shows neutral placeholder text (e.g., "No MIDI input") rather than being blank or showing stale data.
4. **Given** a MIDI controller is sending rapid continuous messages (e.g., aftertouch, a controller sweep), **When** the user watches the display, **Then** the readout updates visibly without thrashing so fast that individual values become unreadable.

---

### User Story 2 - Toggle "Ignore SysEx" from preferences (Priority: P2)

A keyboardist whose device periodically transmits System Exclusive dumps (e.g., configuration broadcasts, preset dumps) finds their activity display flooded with SysEx lines. They open the preferences menu from the icon on the right of the Edit header, turn on "Ignore SysEx", and the SysEx messages immediately stop appearing in the display. The rest of their MIDI (notes, CC, program changes) keeps flowing through as before.

**Why this priority**: The feature is explicitly called out in the user input, and it solves a real annoyance. It also exercises the preferences system end-to-end (UI entry point, menu, toggle, subsystem behavior change), validating that the system works before more preferences are added in later features.

**Independent Test**: Send a SysEx message (from a connected device, a loopback utility, or a software tool) and verify it appears in the display. Open the preferences menu via the header icon. Toggle "Ignore SysEx" on. Send another SysEx message and verify it does NOT appear in the display. Non-SysEx messages (Note On, CC) sent during the same period MUST continue to appear.

**Acceptance Scenarios**:

1. **Given** a SysEx message is being sent by a device and "Ignore SysEx" is off, **When** the message arrives, **Then** the activity display shows the SysEx (in an abbreviated form).
2. **Given** the user is in Edit mode, **When** they tap the preferences icon on the right of the header, **Then** the preferences menu opens showing at minimum the "Ignore SysEx" toggle.
3. **Given** the preferences menu is open and "Ignore SysEx" is off, **When** the user toggles it on, **Then** the change takes effect without needing a save step and the menu reflects the new state.
4. **Given** "Ignore SysEx" is on, **When** a SysEx message arrives from any connected device, **Then** it does NOT appear in the activity display and does NOT disturb a currently-displayed non-SysEx message.
5. **Given** "Ignore SysEx" is on, **When** a non-SysEx message (Note On, CC, Program Change, etc.) arrives, **Then** it still appears in the activity display normally.
6. **Given** the preferences menu is open, **When** the user dismisses it (tap-outside, a close control, or an OS back gesture where applicable), **Then** the menu closes and the user returns to the Edit view.

---

### User Story 3 - Preferences persist across app restarts (Priority: P3)

A user who has customized their preferences — for example, turned on "Ignore SysEx" — expects that setting to still be in effect the next time they launch the app. They should not have to reconfigure anything session to session.

**Why this priority**: Losing a preference on every restart would quickly erode trust and defeat the purpose of having a preferences system. It is P3 only because US1 and US2 can be demonstrated end-to-end within a single session; persistence is the property that makes preferences actually useful over time.

**Independent Test**: Turn on "Ignore SysEx". Force-quit the app. Relaunch. Open the preferences menu and verify "Ignore SysEx" is still on. Separately, confirm that any incoming SysEx message is still being filtered before relying on the toggle's visual state alone.

**Acceptance Scenarios**:

1. **Given** the user has turned "Ignore SysEx" on and closed the app, **When** the user relaunches the app, **Then** "Ignore SysEx" is still on without any user action.
2. **Given** the app is being cold-launched for the very first time with no prior preferences saved, **When** the app finishes loading, **Then** each preference takes its documented default value ("Ignore SysEx" defaults to off).

---

### Edge Cases

- **No MIDI devices connected** at app launch: the subsystem starts with zero active subscriptions; the activity display shows placeholder text. No error state is surfaced to the user.
- **Device connected while app is running**: the subsystem MUST auto-subscribe to the new device without user intervention. Messages from the new device appear in the display exactly as they would from a device connected at launch.
- **Device disconnected while app is running**: the subsystem MUST cleanly release the subscription without crashing or freezing. If the last-received message was from the now-disconnected device, the display continues to show it (it is the "latest") until a newer message arrives from any device.
- **Multiple devices sending simultaneously**: the display shows the most recently received message across all devices. Order of display during rapid bursts is "eventual consistency" — the UI lands on some recent message, not a deterministically ordered sequence.
- **Very high message rate** (dense CC streams, MIDI clock): the display updates are rate-limited so the text remains readable. The underlying subsystem MUST continue to receive and process every message; only the visual update is throttled.
- **Mode switch (Edit → Perform → Edit) while messages are flowing**: the MIDI subsystem does NOT pause. When returning to Edit, the display shows whatever is the latest message at that moment.
- **SysEx toggle changes while a SysEx is mid-transmission**: the toggle applies to messages received going forward; a SysEx already displayed remains visible until the next message arrives.
- **Opening preferences in landscape vs portrait on tablet, or on phone**: the menu layout adapts so all controls remain fully visible and tappable on every supported form factor.

## Requirements *(mandatory)*

### Functional Requirements

**MIDI input subsystem**

- **FR-001**: The app MUST detect all MIDI input devices exposed by the underlying platform (USB MIDI, Bluetooth MIDI once paired at the OS level, virtual/software MIDI ports) on launch and while running.
- **FR-002**: The app MUST open an input connection to each detected device and listen to all incoming messages by default.
- **FR-003**: The app MUST handle hot-plug events: devices connected while the app is running MUST be subscribed automatically; devices disconnected MUST be cleanly unsubscribed without error, crash, or UI freeze.
- **FR-004**: The MIDI input subsystem MUST remain active in both Edit and Perform modes. Mode switching MUST NOT interrupt, pause, or reset the subsystem's subscriptions.
- **FR-005**: The subsystem MUST expose a pub/sub interface so UI components can subscribe to incoming messages without polling and without knowing about individual devices.
- **FR-006**: The subsystem MUST honor the "Ignore SysEx" preference. When ON, System Exclusive messages MUST NOT be delivered to subscribers. When OFF, SysEx messages MUST be delivered alongside all other message types.
- **FR-006a**: The subsystem MUST honor the "Ignore System Real-Time" preference. When ON, System Real-Time messages — MIDI Clock (`0xF8`), Start (`0xFA`), Continue (`0xFB`), Stop (`0xFC`), Active Sensing (`0xFE`), and System Reset (`0xFF`) — MUST NOT be delivered to subscribers. When OFF, these messages MUST be delivered alongside all other message types. Default: ON.
- **FR-007**: The subsystem MUST NOT block, allocate on the MIDI receive path, or otherwise introduce latency that would be audible if this feature were extended to pass messages through to output, per the project's real-time MIDI path integrity principle.

**MIDI activity display**

- **FR-008**: The Edit-mode header MUST contain a MIDI activity display positioned in the horizontal center of the header bar.
- **FR-009**: The display MUST show a concise, single-line, abbreviated representation of the most recently received MIDI message.
- **FR-010**: The abbreviated representation MUST identify the message type (Note On, Note Off, Control Change, Program Change, Pitch Bend, Channel Pressure, Polyphonic Aftertouch, System Exclusive, System Real-Time types, and other standard MIDI message types delivered by the subsystem), the MIDI channel (displayed 1–16 per the project glossary) for channel-scoped messages, and the primary data values appropriate to that message type (e.g., note name + velocity for Note On/Off, controller number + value for Control Change). Messages filtered by the "Ignore SysEx" or "Ignore System Real-Time" preferences are not delivered to the display and therefore cannot appear in it (FR-006, FR-006a).
- **FR-011**: When no MIDI messages have been received in the current session, the display MUST show neutral placeholder text indicating the idle state (e.g., "No MIDI input").
- **FR-012**: The display MUST update within perceived-instant time (≤100ms) of a message being received, but the visible update rate MUST be bounded so that during dense streams (many messages per second) the text does not thrash so fast as to be unreadable.
- **FR-013**: The display MUST NOT appear in Perform mode. Perform mode's chrome-free invariant (from feature 001) is preserved.

**Preferences system**

- **FR-014**: The Edit-mode header MUST contain a preferences entry point on the right side of the header, visually recognizable as a settings control (e.g., a gear-style glyph).
- **FR-015**: Activating the preferences control MUST open a preferences menu presented as a full-screen overlay that fully covers the Edit surface and lists all user-configurable preferences.
- **FR-016**: The preferences menu MUST include an "Ignore SysEx" toggle and an "Ignore System Real-Time" toggle. The menu MUST be structured so that additional preferences can be added in later features without restructuring the menu frame or navigation.
- **FR-017**: Changes to preferences MUST take effect immediately (no explicit "save" step required).
- **FR-018**: Preferences MUST persist on-device across app cold launches. Persisted values MUST be restored on launch before any consumer of the preference (the MIDI subsystem) reads it for the first time in the session.
- **FR-019**: On first-ever launch with no persisted preferences, every preference MUST take its documented default value. Defaults: "Ignore SysEx" → OFF, "Ignore System Real-Time" → ON.
- **FR-020**: The preferences menu MUST be dismissable. Because it is a full-screen overlay (FR-015) there is no tap-outside region; dismissal MUST be available via an explicit close control inside the overlay and, on Android, via the OS back gesture.

**Cross-cutting (constitutional alignment)**

- **FR-021**: All new interactive controls (preferences icon, toggle control, dismiss control, any input affordance in the menu) MUST satisfy the project's touch-target minimums, dark-theme palette, hover prohibition, and no-multi-touch-required rules (constitution Principle VI).
- **FR-022**: All new interactive controls MUST be reachable via a physical keyboard with clearly visible focus states against the dark background, and MUST convey state through more than color alone (constitution Principle VII).
- **FR-023**: The MIDI subsystem, activity display, and preferences persistence MUST degrade gracefully in the face of missing or failed underlying services (platform MIDI unavailable, persistent storage unreadable): the app MUST continue to run and remain usable, surfacing any error through non-modal UI that does not interrupt Edit or Perform flow.

### Key Entities

- **MIDI Input Device**: A detected input source exposed by the platform. Attributes include a stable identifier (opaque string provided by the platform), a human-readable name, and a connection state (connected / disconnected). Multiple devices may be present at the same time.
- **MIDI Message**: A parsed inbound MIDI event. Attributes include message type (see FR-010 for the minimum supported set), MIDI channel where applicable (1–16 per glossary), a type-specific payload (e.g., note number + velocity, controller number + value, program number, pitch value, raw SysEx bytes), and a receive timestamp. The source device's identity may be attached.
- **Preference**: A single named user-configurable setting. Attributes include a stable key, a current value, a documented default value, and a value type. For this feature the preferences are `ignoreSysEx` (boolean, default `true`) and `ignoreSystemRealTime` (boolean, default `true`).
- **Preferences Store**: The collection of all Preferences together with its persistence mechanism. Invariants: (1) values load before any consumer reads them in the session, (2) changes take effect immediately in memory, (3) changes persist before the next cold launch reads them, and (4) a store failure (read or write) degrades gracefully — preferences fall back to their defaults for the session and the app does not crash.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user connecting any MIDI controller and playing one note sees feedback in the header activity display within 200ms of playing the note, on 100% of attempts with a working device.
- **SC-002**: While a connected device is streaming continuous messages at full MIDI rate (e.g., aftertouch, a sweeping control change), the activity display remains responsive — the text updates visibly and legibly without freezing, lagging behind by more than one second, or thrashing so fast as to be unreadable.
- **SC-003**: With "Ignore SysEx" on, zero SysEx messages produce a visible change in the activity display for the duration of the setting being on. The same property holds for "Ignore System Real-Time" with respect to System Real-Time messages.
- **SC-004**: Toggling "Ignore SysEx" off while SysEx is being transmitted results in SysEx reappearing in the display on the next-received SysEx message, with no additional user action required. The same property holds for toggling "Ignore System Real-Time" off.
- **SC-005**: A user who sets a preference and then force-quits and relaunches the app sees the preference's value preserved on 100% of relaunches.
- **SC-006**: A first-time user, given only the instruction "turn off SysEx messages," locates the preferences menu and toggles the option in under 30 seconds on their first attempt.
- **SC-007**: Disconnecting any MIDI device while the app is running does not crash the app, freeze the UI, or cause the activity display to enter an inconsistent state.
- **SC-008**: The activity display is never visible in Perform mode (Perform mode's chrome-free invariant from feature 001 is preserved).

## Assumptions

- **Scope of "all detected MIDI input devices"**: includes USB MIDI, Bluetooth MIDI once paired at the OS level, and virtual/software MIDI ports visible to the platform. Network MIDI (RTP-MIDI / AppleMIDI) is OUT OF SCOPE for this feature; it may be added in a later spec.
- **MIDI output is OUT OF SCOPE** for this feature. The subsystem receives only; sending MIDI to synths is the subject of a later feature.
- **Default state of "Ignore SysEx"** is OFF (SysEx messages ARE delivered), because the user's description frames SysEx-ignoring as an option rather than the default behavior.
- **MIDI subsystem lifecycle**: runs continuously while the app is running, in both Edit and Perform modes. The display, which is Edit-only, is a consumer of the subsystem and its absence in Perform mode does not affect the subsystem.
- **Abbreviated format**: a single line of text with the message type label, the channel (when applicable), and the most relevant data values for the type. The exact punctuation, separator, and word order are an implementation and design detail; tests will pin the presence of the fields and the abbreviation (not the exact string).
- **Preferences menu presentation**: a full-screen overlay on both tablet and phone (no centered-dialog or bottom-sheet variant). The overlay fully covers the Edit surface while it is open. Because there is no "outside" to tap, the overlay MUST provide an explicit close control, and on Android the OS back gesture MUST also dismiss it. Layout inside the overlay must satisfy the constitution's touch-target, dark-theme, and keyboard-accessibility rules.
- **Preferences storage location**: on-device local storage. The specific mechanism is an implementation detail resolved during `/speckit-plan`. No cloud sync is implied for this feature.
- **Preferences set in this feature**: "Ignore SysEx" (default OFF) and "Ignore System Real-Time" (default ON). The preferences system itself is built to accommodate additional preferences in future features without restructuring.
- **Preferences icon**: a standard settings glyph (commonly a gear). Exact icon source is an implementation detail; the icon MUST be recognizable and sized for touch.
- **Activity display update rate**: the display updates within 100ms of a received message but is throttled to a readable frequency (on the order of low tens of updates per second at most). Exact rate is an implementation and design detail informed by the target tablet's refresh rate.
- **Order of display during rapid bursts**: eventual consistency only. The display lands on a recent message but does not guarantee a specific ordering across messages received in the same display frame.
- **Simulator / emulator MIDI testing**: platform MIDI is typically unavailable in simulators. End-to-end validation will require a physical or virtual MIDI source reachable by the test device, consistent with the constitution's release-gate rule for MIDI-path changes.
