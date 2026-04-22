# Quickstart: Keyboard Display Component

**Feature**: `004-keyboard-view`
**Date**: 2026-04-22

This is a manual-QA walkthrough exercising the keyboard component and the Storybook workshop. Run it against the dev-client build (the one produced by `npm run ios` / `npm run android`).

---

## Prerequisites

- A recent dev-client build installed on an iPad / iPhone simulator and an Android emulator. (Feature 002 is the first build that needs the dev client; if it works for 002, it works for this.)
- `npm test` passes on the current branch before you start.
- No code changes pending from other features — test on a clean `004-keyboard-view` branch state.

---

## US1 — Component renders a keyboard with range and highlights

The component is not wired into any app screen in this feature. You verify it through Storybook (US2) or by temporarily mounting it in `App.tsx` for a spot check. Recommended path: use Storybook.

If you really want to eyeball it in `App.tsx` without Storybook:

1. Open `App.tsx`.
2. Temporarily insert:
   ```tsx
   <View style={{ padding: 24 }}>
     <Keyboard low={48} high={72} highlighted={[60, 64, 67]} />
   </View>
   ```
3. Reload the app. Expect: a two-octave keyboard renders near the top of Edit mode, with Middle C, E4, and G4 highlighted blue.
4. Undo the change after eyeballing — do NOT commit this spike.

---

## US2 — Storybook workshop

### Start Storybook

1. From the repo root:
   ```
   npm run storybook:generate
   npm run storybook
   ```
2. In a second terminal (or a simulator that's already running), ensure the dev client is open on the Storybook entry.
3. **Expect**: the dev client now shows the Storybook UI (navigator on the side / top, story viewer in the rest of the screen).

### Walk the stories

Select each story in turn and verify the expected visual:

| Story                        | What to verify |
|------------------------------|----------------|
| Full 88-key piano            | A0 through C8 visible. Every key present. No highlights. Scrolling is NOT required — the keys simply become thinner. |
| Middle C highlighted         | A C3..C5 keyboard. One key (Middle C) is blue; all others neutral. |
| C major chord                | Same range. Three white keys (C4, E4, G4) are blue. |
| Chromatic selection          | Same range. Five contiguous keys — C4, C#4, D4, D#4, E4 — are all blue (both white and black). |
| Empty highlights             | Same range. No blue keys. Verifies baseline look. |
| One octave (root + octave)   | C4..C5 range. Two blue keys at the ends (C4 and C5). |
| Narrow container (320 pt)    | Component fills the narrow wrapper; all keys still visible; black keys still distinguishable. |
| Wide container (1000 pt)     | Component fills the wide wrapper; keys appear larger. |

### Cross-cutting checks

1. **Rotation**: with any story open, rotate the device. **Expect**: the keyboard re-lays out to the new width with no flicker or gap. Highlights remain on the same MIDI notes.
2. **Story switch**: switch between stories in rapid succession. **Expect**: each render is crisp; no leftover keys from a prior story remain.
3. **Dark mode**: the app uses dark mode only. **Expect**: white keys read as "ivory" (not glaring white) against the dark surface; black keys are clearly darker. Blue highlights are legible in dim conditions.
4. **Error case**: temporarily edit one of the stories (e.g., `MiddleCHighlighted`) to set `low = 49` (a black key). **Expect**: the story shows the `keyboard-error` placeholder with text "Keyboard: invalid range..." rather than crashing the workshop. Revert after testing.

### Stop Storybook

1. Stop Metro in the terminal.
2. Re-run `npm run ios` or `npm run android` without the Storybook env var to return to the normal app.

---

## Edge-case spot checks

- **Full 88-key on 320 pt phone portrait**: open the Full 88-key story on an iPhone SE or equivalent (or a simulator at 320 pt wide). **Expect**: all 88 keys visible, keys thin but individually distinguishable, no horizontal overflow.
- **Highlight at both extremes**: temporarily edit a story to `low=21, high=108, highlighted=[21, 108]`. **Expect**: the leftmost and rightmost white keys are blue.
- **Out-of-range highlight**: temporarily edit a story to `low=48, high=72, highlighted=[100]`. **Expect**: zero blue keys (the 100 is outside the range and is silently ignored).

---

## Accessibility spot checks

- VoiceOver and TalkBack are not required to work perfectly per Principle VII, but with them enabled landing focus on the component should announce the generated label (e.g., "Keyboard, range C3 to C5, 3 highlighted: C4, E4, G4").
- Eyeball contrast: the blue highlight is legible against both white and black keys at minimum screen brightness.

---

## Troubleshooting

| Symptom                                                             | Likely cause                                                                  |
|---------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `npm run storybook` shows the normal app (not Storybook)            | `EXPO_PUBLIC_STORYBOOK` not being picked up. Confirm the env var is set by the script; try restarting Metro with the cache cleared (`--clear`). |
| Storybook UI loads but no stories are listed                        | `storybook.requires.ts` is out of date. Re-run `npm run storybook:generate`.  |
| Keyboard renders with overlapping keys                              | `computeKeyboardLayout` is receiving `containerWidth <= 0`. Check that `onLayout` fires on the component's root View. |
| Keyboard renders but never updates on rotation                      | `width` state not being updated from `onLayout`. Check the `useState` + `onLayout` wiring in `Keyboard.tsx`. |
| Error placeholder appears when it shouldn't                         | Props violate the white-key or range contract. Inspect `low`, `high`, and the props' types (numbers, not strings). |
| Highlighted keys are invisible against black keys                   | Blue-vs-black contrast is too low. Verify `keyboardHighlight` token hex against `keyboardBlackKey`. Adjust `keyboardBlackKey` slightly lighter if needed. |

---

## Completion criteria

The feature is ready to merge when:

- All three test files pass on `npm test`.
- `npx tsc --noEmit` reports no errors.
- Every story in the Storybook workshop renders without throwing.
- Manual QA walkthrough above passes on at least one tablet and one phone target (iOS and/or Android).
- WCAG AA contrast verified for the three new color tokens against their documented pairings.
