# Feature Specification: Edit Mode View Switcher

**Feature Branch**: `003-edit-view-nav`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Redesign of header and prep for next views in edit mode. On tablet, create a 3-button toggle for 'Setup', 'Patches', and 'Cues' views that is in the header to the right of 'Perform'. On phone, make a button called 'View' that spawns a dropdown containing 'Setup', 'Patches', 'Cues', and 'Perform' as options, replacing the 'Perform' button."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Tablet: segmented view switcher (Priority: P1)

A performing musician using the app on a tablet can see and tap a three-segment control in the Edit-mode header to switch between the **Setup**, **Patches**, and **Cues** views of Edit mode without leaving Edit mode.

**Why this priority**: Tablet is the primary stage device because its larger display accommodates both the always-visible view switcher and the view content itself. Without direct access to the three sub-views, Edit mode has no way to reach the work surfaces the rest of the feature set will live on.

**Independent Test**: On a tablet-sized device, enter Edit mode and verify that (a) a three-segment switcher is visible in the header immediately to the right of the `Perform` button, (b) tapping a segment visually marks it selected and the body area below swaps to that view's placeholder content, and (c) the previously-selected segment is no longer marked selected.

**Acceptance Scenarios**:

1. **Given** the app is in Edit mode on a tablet and the user has not yet touched the view switcher, **When** the header is first shown, **Then** one segment is visually marked as the current selection and the body area shows that view's content.
2. **Given** the app is in Edit mode on a tablet with the Setup segment selected, **When** the user taps the Patches segment, **Then** the Patches segment becomes the marked selection, the Setup segment is unmarked, and the body area switches to show Patches content within one visual frame (no perceptible loading).
3. **Given** the app is in Edit mode on a tablet, **When** the user inspects the header, **Then** the `Perform` button remains present to the left of the three-segment switcher, and the Preferences control remains present at the far right of the header.
4. **Given** the app is in Edit mode on a tablet with the Cues segment selected, **When** the user rotates the device between portrait and landscape, **Then** the Cues segment remains selected and the Cues view is still shown.

---

### User Story 2 — Phone: View dropdown (Priority: P1)

A musician using the app on a phone can open a single "View" control in the Edit-mode header to pick which of **Setup**, **Patches**, **Cues**, or **Perform** they want. Selecting one of the three Edit sub-views switches the body; selecting Perform leaves Edit mode and enters Perform mode.

**Why this priority**: Phone is a first-class surface for the app. The three-segment control is too wide for the phone header, so the dropdown is the only way a phone user can reach the sub-views or move to Perform mode from Edit. Without it, a phone user is locked out of the same surfaces tablet users get.

**Independent Test**: On a phone-sized device, enter Edit mode. Verify that (a) no standalone `Perform` button is present, (b) a control labeled "View" appears in its place, (c) tapping it opens a dropdown that contains exactly four options — Setup, Patches, Cues, Perform — with the current Edit sub-view indicated, (d) selecting one of the three Edit sub-views dismisses the dropdown and swaps the body, and (e) selecting Perform dismisses the dropdown and the app is now in Perform mode.

**Acceptance Scenarios**:

1. **Given** the app is launched in Edit mode on a phone, **When** the header is first shown, **Then** a control labeled "View" is visible in the same slot where the `Perform` button appears on tablet, and the standalone `Perform` button is not rendered.
2. **Given** the app is in Edit mode on a phone with Setup as the current sub-view, **When** the user taps the "View" control, **Then** a dropdown lists Setup, Patches, Cues, Perform in that order, and Setup is visually marked as the current selection.
3. **Given** the dropdown is open on a phone, **When** the user taps "Patches", **Then** the dropdown closes and the body area swaps to Patches content. The "View" anchor's label remains the literal string "View"; the current sub-view is indicated only inside the menu (when next opened) via a checkmark on the selected entry.
4. **Given** the dropdown is open on a phone, **When** the user taps "Perform", **Then** the dropdown closes and the app is now in Perform mode.
5. **Given** the dropdown is open on a phone, **When** the user taps outside the dropdown (or uses the platform back gesture on Android), **Then** the dropdown closes with no change to the current view or mode.

---

### User Story 3 — Returning to Edit preserves the last sub-view (Priority: P2)

A user who was on a particular Edit sub-view (e.g., Patches), then switches to Perform mode and later returns to Edit mode within the same session, finds themselves back on the same sub-view they left (Patches), not reset to the default.

**Why this priority**: This is a quality-of-life concern rather than a gating one. Users can still reach any sub-view via the switcher, but losing their place on every mode switch is friction during a working session. P2 because the feature is usable without it; Stage 1 can ship with reset-to-default if time is tight.

**Independent Test**: Enter Edit mode, switch to Patches (or any non-default sub-view), switch to Perform mode, return to Edit mode, verify that Patches is still selected and shown. Re-run on both tablet and phone layouts.

**Acceptance Scenarios**:

1. **Given** the user is in Edit mode with Patches selected, **When** they switch to Perform mode and then return to Edit mode, **Then** Patches is still the selected sub-view and its content is shown.
2. **Given** the app cold-launches (fresh process, no in-memory session), **When** the user enters Edit mode, **Then** the default sub-view is shown, not whatever was selected in a previous session.

---

### Edge Cases

- **Device rotation mid-session**: The selected sub-view and any open dropdown should handle a rotation event gracefully — the selection persists; an open dropdown either persists (preferred) or closes without losing the selection.
- **Phone in landscape with limited vertical space**: The dropdown must not be clipped by the keyboard, safe-area insets, or the bottom edge. If it would exceed available space it should scroll.
- **Tablet with unusually narrow window** (e.g., iPad split-view in 1/3 configuration): When the window is narrow enough that the three-segment switcher does not fit alongside the rest of the header, the phone layout (View dropdown) must be used instead. The cutover is based on available header width, not device class.
- **Accessibility — VoiceOver / TalkBack**: Segmented control announces "selected" state for the active segment; dropdown announces current selection when opened and each option's selection state as the user traverses.
- **External keyboard**: Segments and dropdown items are reachable via Tab/arrow keys; a visible focus ring appears on the focused control.
- **Rapid taps on the segmented control**: Tapping Setup → Patches → Cues in rapid succession must end on Cues without intermediate flicker or stuck state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Edit-mode header MUST expose a means for the user to switch among the Setup, Patches, and Cues sub-views of Edit mode.
- **FR-002**: On a tablet-class layout, the header MUST render a three-segment switcher with the segments labeled "Setup", "Patches", "Cues", in that order, placed immediately to the right of the `Perform` button. The standalone `Perform` button remains in place.
- **FR-003**: On a phone-class layout, the header MUST render a single control labeled "View" in the slot where the tablet layout shows the `Perform` button. The standalone `Perform` button MUST NOT be rendered.
- **FR-004**: Tapping the "View" control on a phone MUST open a dropdown containing exactly four options in this order: Setup, Patches, Cues, Perform.
- **FR-005**: Exactly one of Setup, Patches, Cues MUST be the current Edit sub-view at any time. The current selection MUST be visually distinguishable in the segmented control (tablet) and in the dropdown when open (phone).
- **FR-006**: Selecting Setup, Patches, or Cues MUST swap the body area below the header to that view's content, with no visible loading state.
- **FR-007**: Selecting Perform from the phone dropdown MUST switch the app to Perform mode, equivalent in effect to tapping the `Perform` button on tablet.
- **FR-008**: The default sub-view on first entering Edit mode in a session MUST be Setup.
- **FR-009**: Within a single app session, the selected sub-view MUST be preserved across mode switches (Edit → Perform → Edit returns to the same sub-view).
- **FR-010**: The Preferences control and MIDI activity readout already in the Edit header MUST remain present and functional; the new control(s) MUST NOT displace or obscure them.
- **FR-011**: The dropdown on phone MUST close without side effects when the user taps outside it or uses the platform's native dismissal gesture (e.g., Android system back).
- **FR-012**: Switching between tablet and phone layouts (e.g., iPad split-view resize, foldable unfold) while Edit mode is active MUST preserve the current sub-view selection and MUST swap the header control without a full re-entry to the mode.
- **FR-013**: Each of the Setup, Patches, and Cues views MUST render at least an identifiable placeholder for this feature — concrete content is delivered by follow-up features. The placeholder MUST make clear which of the three views is currently shown.
- **FR-014**: All three sub-view controls (segments on tablet, dropdown items on phone) MUST be reachable by assistive technology and by external keyboard navigation, with the current selection state announced.

### Key Entities

- **Edit Sub-View**: A named work surface within Edit mode. Attributes: a stable key (one of `setup`, `patches`, `cues`), a display label ("Setup", "Patches", "Cues"), and an indication of whether it is the currently selected sub-view. Order is fixed: Setup, Patches, Cues.
- **Edit View Selection**: The session-scoped record of which sub-view is currently active. Lives for the duration of the running app process; does not persist to storage in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a tablet, a user can switch from the default sub-view to either of the other two sub-views in one tap — the tap target for each segment is at least 44×44 points and the segment label is legible at default system font size.
- **SC-002**: On a phone, a user can switch to any of the four destinations (Setup, Patches, Cues, Perform) in at most two taps (open View → pick destination).
- **SC-003**: Switching sub-view produces a visible body change within one frame (≤ 1/60 s on 60 Hz devices) — no loading indicator ever appears for a sub-view swap.
- **SC-004**: Within a session, 100% of Edit → Perform → Edit round-trips land the user back on the sub-view they left, not on the default.
- **SC-005**: The header layout remains uncluttered: on the smallest supported phone width in portrait, the View control, the MIDI activity readout, and the Preferences control all render without truncation or overlap.
- **SC-006**: Assistive-technology users can hear which sub-view is selected and can move selection via a single assistive gesture per destination.
- **SC-007**: Users tracking adoption of the new sub-views report that reaching Patches or Cues "feels like the same interaction" as reaching Setup — in practice: no feature-flag or hidden setting blocks any of the three sub-views on either layout.

## Assumptions

- The "tablet vs phone" decision for header layout is made from available header (or screen) width at runtime, not from device class or OS idiom. The exact breakpoint follows the project's existing layout heuristic — this feature does not introduce a new breakpoint policy.
- "Edit sub-view selection" is in-memory session state. It is not persisted to AsyncStorage. Cold launch resets to Setup. (If cross-launch persistence is needed, it will be added in a later feature and will not affect the UI contract defined here.)
- The three view placeholders (Setup, Patches, Cues) are visually distinguishable but otherwise empty shells for this feature. The concrete editing surfaces that will live inside them are out of scope and will be delivered by follow-up features.
- The Preferences gear and the MIDI activity readout in the Edit header retain their current positions (far right and center, respectively). The view switcher is inserted between the `Perform` button slot and the MIDI activity readout on tablet; on phone the View control occupies the `Perform` slot only.
- The `Perform` entry in the phone dropdown performs the same action as the tablet's `Perform` button: an immediate switch to Perform mode, with the current Edit sub-view preserved for when the user returns to Edit.
- Perform mode itself is unaffected by this feature — the view switcher is strictly an Edit-mode concern.
- The feature ships to both iOS (iPhone + iPad) and Android (phone + tablet). No platform-specific behavior differences are introduced beyond what falls out of native dropdown/menu affordances.
