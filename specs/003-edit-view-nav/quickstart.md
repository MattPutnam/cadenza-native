# Quickstart: Edit Mode View Switcher

**Feature**: `003-edit-view-nav`
**Date**: 2026-04-21

This is a manual-QA walkthrough exercising every user story and every edge case in [`spec.md`](./spec.md). Run it against a dev-client build. All three sub-views are placeholders in this feature; "works" means the correct placeholder label (Setup / Patches / Cues) appears in the body when selected.

---

## Prerequisites

- Dev client installed on an iPad (or iPad simulator), an iPhone (or iPhone simulator), and an Android phone/tablet. Web builds are not part of the acceptance surface for this feature.
- Metro bundler running (`npm run ios:ipad` / `npm run ios:iphone` / `npm run android:phone` / `npm run android:tablet`).
- No prior instance of the app is pinned to an old build — wipe app data before the cold-launch check in US3.

---

## US1 — Tablet: segmented view switcher

1. Launch the app on a tablet (or iPad simulator). Default mode is Edit.
2. **Expect**: the header shows, left to right: `Perform` button → a three-segment control labeled **Setup | Patches | Cues** → MIDI activity readout → Preferences gear (far right).
3. **Expect**: the **Setup** segment is visually marked as selected (distinct fill) and the body area shows the Setup placeholder.
4. Tap **Patches**. **Expect**: Patches becomes the marked selection, Setup is no longer marked, and the body swaps to the Patches placeholder instantly (no spinner, no flash of empty content).
5. Tap **Cues**. **Expect**: same behavior, now on Cues.
6. Re-tap **Cues**. **Expect**: no change — still on Cues, no flicker.
7. Rotate the device between portrait and landscape. **Expect**: the currently-selected segment remains selected and the body still shows the matching placeholder.

---

## US2 — Phone: View dropdown

1. Launch the app on a phone (or iPhone simulator in portrait).
2. **Expect**: the header shows, left to right: a single button labeled **View** → MIDI activity readout → Preferences gear. The standalone `Perform` button is NOT present.
3. Tap **View**. **Expect**: a dropdown appears, anchored below the `View` button, listing in this order: **Setup**, **Patches**, **Cues**, **Perform**. The current Edit sub-view (initially Setup) is visually marked (leading checkmark or similar) as selected.
4. Tap **Patches**. **Expect**: the dropdown closes, the body swaps to the Patches placeholder, and the `View` button label/state reflects that Patches is now current.
5. Tap **View** again → tap **Perform**. **Expect**: the dropdown closes and the app is now in Perform mode.
6. Return to Edit mode (use whatever the Perform screen's "back" affordance is, from feature 001).
7. Tap **View** again. **Expect**: the dropdown still lists Setup, Patches, Cues, Perform; Patches is marked selected (preserved from step 4).
8. Tap outside the dropdown (the transparent backdrop). **Expect**: the dropdown closes with no change.
9. Open the dropdown once more, then use the platform back gesture (Android) or `Escape` on a hardware keyboard (iOS). **Expect**: the dropdown closes with no change.

---

## US3 — Session preservation across mode switches

1. On either tablet or phone, enter Edit mode with **Cues** selected.
2. Switch to Perform mode (tablet: the `Perform` button; phone: `View → Perform`).
3. Return to Edit mode.
4. **Expect**: the body still shows the Cues placeholder; the switcher still marks Cues as selected. No "bounce" to Setup.
5. Force-quit the app and cold-launch.
6. **Expect**: the body shows Setup (default on cold launch); Cues has been forgotten.

---

## Edge-case spot checks

### iPad split-view cutover

1. On an iPad, open the app in full-screen Edit mode with Patches selected.
2. **Expect**: tablet layout is shown (segmented control visible).
3. Use Slide Over / Split View to place another app alongside Cadenza in a 1/3 configuration.
4. **Expect**: Cadenza's header immediately re-renders as the phone variant (the segmented control is replaced by the `View` button). Patches remains selected; the body still shows Patches.
5. Widen the split back to 2/3 or full-screen.
6. **Expect**: the header flips back to the tablet variant; the segmented control shows Patches as selected.

### Dropdown dismissal paths

1. On phone, open the `View` dropdown.
2. Confirm EACH of these closes the dropdown with no side effects:
   - Tap the backdrop (area outside the menu).
   - Android back gesture.
   - Rotate the device (the menu may close; if it stays open, subsequent interactions still work).
3. **Expect**: none of these change `editView` or `mode`.

### Rapid tapping

1. On tablet, tap Setup → Patches → Cues in rapid succession (<1 s between taps).
2. **Expect**: the final state is Cues; no flicker of intermediate states sticking around.

### External keyboard (optional, iPad + hardware keyboard)

1. Attach a hardware keyboard to the iPad.
2. Use Tab to move focus into the segmented control.
3. **Expect**: a visible focus ring appears on the first focused segment.
4. Press `Tab` to advance focus; `Enter` to activate the focused segment.
5. **Expect**: the body swaps to the newly-activated segment's view.

### Dark mode legibility

1. In a dim room or at minimum brightness, open Edit mode and open each variant (tablet and phone).
2. **Expect**: labels are readable; the selected segment / checked menu item is distinguishable from unselected ones by more than color alone (background fill or check glyph).

---

## Accessibility spot checks

- **VoiceOver (iOS)** or **TalkBack (Android)** is NOT required to work perfectly for this feature per Constitution VII, but cheap labels should still announce sensibly:
  - Segments announce as "Setup, tab, selected" (or equivalent) when selected, "Patches, tab" otherwise.
  - The `View` button announces as "View, button". Each menu item announces its label; the selected one announces "selected".
- **Keyboard focus rings**: the existing `colors.focusRing` is visible against the dark header; verify at minimum brightness.
- **Color contrast**: eyeball-check that the selected segment's label is readable against its filled background; if it fails visibly, flag for the contrast-verification task in `tasks.md`.

---

## Troubleshooting

| Symptom                                                              | Likely cause                                                                 |
|----------------------------------------------------------------------|------------------------------------------------------------------------------|
| Segmented control visible on iPhone portrait                         | `TABLET_MIN_WIDTH` too low, or `useLayoutMode` not consuming `useWindowDimensions`. |
| View dropdown visible on iPad full-screen                            | `TABLET_MIN_WIDTH` too high, or the hook is reading `Dimensions.get('screen')` instead of the window. |
| Sub-view resets to Setup after Edit → Perform → Edit                 | `EditViewProvider` is mounted inside `EditMode` rather than above it in `Shell`. |
| Dropdown opens but nothing happens on tap                            | `Modal`'s `transparent` prop omitted, or the menu container is not inside the `Modal`. |
| Dropdown doesn't close on Android back                               | `onRequestClose` not wired on the `Modal`.                                   |
| Focus ring not visible on segments                                   | `colors.focusRing` not applied on focused state; check `onFocus` / `onBlur` wiring. |

---

## Completion criteria

The feature is ready to merge when:

- All three user stories pass on both tablet and phone (iOS and Android).
- All edge-case spot checks above pass.
- The full `__tests__/` suite is green.
- `contracts/ui-surfaces.md` contrast requirements verified against the final color tokens.
