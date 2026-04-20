# Feature Specification: App Shell — Edit and Perform Modes

**Feature Branch**: `001-app-shell-modes`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Build the base of the app. The app has two main states: 'edit' and 'perform'. In edit mode there is a header bar across the top. On the left side of the header bar is a button labeled 'Perform' which switches to perform mode. In perform mode, the entire screen is black and there is an 'x' in the top left to take us back to edit mode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch between Edit and Perform modes (Priority: P1)

A keyboardist has finished editing their setup for a song and is ready to perform. They tap a single control to switch into Perform mode, which presents a distraction-free black screen suitable for a darkened orchestra pit. When they need to return to editing — between songs, after a show, or to fix a setup detail — they tap a single control to return to the Edit interface.

**Why this priority**: This is the entire feature. Without it there is no way to enter or leave performance mode, which is the product's primary on-stage state. It also establishes the app's top-level shell that all future features render inside.

**Independent Test**: Launch the app. Verify it opens in Edit mode showing a header bar with a "Perform" button on the left. Tap the button; verify the screen becomes all black with an "x" in the top-left corner. Tap the "x"; verify the Edit-mode header bar reappears. Repeat the round trip several times to confirm it remains stable.

**Acceptance Scenarios**:

1. **Given** the app is in Edit mode with the header bar visible, **When** the user taps the "Perform" button on the left of the header, **Then** the screen fills with black, the header bar disappears, and an "x" control appears in the top-left corner.
2. **Given** the app is in Perform mode showing the black screen with the "x" control, **When** the user taps the "x", **Then** the Edit-mode header bar reappears and the app is in Edit mode.
3. **Given** the app has just been cold-launched, **When** it finishes loading, **Then** it is in Edit mode with the header bar visible.

---

### User Story 2 - Predictable launch state (Priority: P2)

A user who closed the app — intentionally, via a crash, or because the OS reclaimed memory — reopens it. They land in an unambiguous, navigable state rather than an all-black screen that would look broken.

**Why this priority**: Coming from a fresh launch into a black Perform screen would look like a malfunction. A predictable Edit-mode landing is an important reliability affordance, but it is strictly a property of the P1 toggle rather than a separate feature, so it is P2.

**Independent Test**: Force-quit the app. Re-open it. Verify it appears in Edit mode with the header bar, regardless of the mode it was in when it was closed.

**Acceptance Scenarios**:

1. **Given** the app was previously closed while in Perform mode, **When** the user re-opens the app, **Then** the app launches in Edit mode, not Perform mode.

---

### Edge Cases

- **Device rotation during Perform mode**: The "x" control MUST stay in the top-left corner of the new orientation. The black background MUST continue to fill the screen.
- **Brief backgrounding during a session** (e.g., an incoming notification, the user swipes to another app and back): The current mode MUST be preserved — a user in Perform mode returns to Perform mode, a user in Edit mode returns to Edit mode.
- **Rapid repeated taps on the mode-switch control**: Only one mode transition occurs per tap; the app MUST NOT enter an intermediate or inconsistent visual state.
- **Tap near the edge of the "x" hit target in Perform mode**: If the user's finger lands inside the defined hit area of the "x", the transition occurs; taps outside the hit area MUST NOT trigger a transition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide two mutually-exclusive user-facing modes: Edit and Perform. Exactly one mode is active at any given time.
- **FR-002**: The app MUST launch into Edit mode on cold start, regardless of the mode it was in when last closed.
- **FR-003**: Edit mode MUST display a header bar spanning the full width of the screen at the top.
- **FR-004**: The Edit-mode header bar MUST contain a button labeled "Perform" positioned on the left side.
- **FR-005**: Tapping the "Perform" button MUST switch the app to Perform mode.
- **FR-006**: Perform mode MUST render a black background filling the entire screen, with no header bar and no other on-screen chrome besides the exit control.
- **FR-007**: Perform mode MUST display a visible "x" (close) control in the top-left corner of the screen, in the orientation that is currently active.
- **FR-008**: Tapping the "x" control in Perform mode MUST return the app to Edit mode.
- **FR-009**: Mode transitions MUST occur immediately upon the triggering tap, with no confirmation dialog, blocking animation, or loading state.
- **FR-010**: The app MUST preserve its current mode when briefly backgrounded and resumed within the same session.
- **FR-011**: The "Perform" button and the "x" control MUST be sized for finger operation consistent with the project's touch-target guidelines, and neither control may require a multi-touch gesture.
- **FR-012**: Both mode-switch controls MUST be reachable via an attached physical keyboard and MUST show a clearly visible focus state when focused, consistent with the project's accessibility principle.
- **FR-013**: Both Edit and Perform modes MUST be rendered in a dark theme, per the project's dark-mode-only UX principle.

### Key Entities

- **Mode**: The top-level user-facing state of the app. Takes one of two values: *Edit* or *Perform*. Exactly one value is active at any time. Mode changes are caused only by the two designated controls (the "Perform" button and the "x" control), never implicitly by other actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can switch from Edit mode to Perform mode with a single tap on the "Perform" button.
- **SC-002**: A user can return from Perform mode to Edit mode with a single tap on the "x" control.
- **SC-003**: In Perform mode, no visible UI elements other than the "x" control appear against the black background.
- **SC-004**: The app appears in Edit mode on 100% of cold launches.
- **SC-005**: Mode transitions complete within perceived-instant time — under 100ms from the moment of tap to the new mode being fully visible — on the primary tablet target.
- **SC-006**: A first-time user, given only the instruction "put the app into performance mode and then come back," can complete the full round trip on their first attempt without assistance.

## Assumptions

- The body area below the Edit-mode header bar is intentionally empty (or shows neutral placeholder content) at this stage. Subsequent features will populate it with song, cue, and patch editors.
- Entering Perform mode does NOT trigger any hardware-level side effects at this stage: no MIDI output changes, no synthesizer program changes, no cue advance. Those behaviors are the subject of separate, later features.
- Screen auto-lock / always-on-display behavior during Perform mode is OUT OF SCOPE for this base feature. A dedicated performance-reliability feature will address keeping the screen awake on stage.
- Alternative entry paths into Perform mode (e.g., via a trigger, pedal, or keyboard shortcut as described in the product overview) are OUT OF SCOPE for this base feature. Only the on-screen "Perform" button is supported here.
- The visual design of the "x" icon is a standard close glyph sized for touch. Its exact shape, stroke weight, and color are implementation details to be resolved during design.
- The project's touch-target sizing, dark-theme palette, and keyboard focus conventions are defined elsewhere (constitution Principles VI and VII, and `docs/design.md`) and apply here without restatement.
