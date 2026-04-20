# Quickstart: App Shell — Edit and Perform Modes

**Feature**: `001-app-shell-modes`
**Date**: 2026-04-19

This quickstart shows how to verify the feature end-to-end once `/speckit-implement` is complete. It replaces the "Hello, World!" manual check that lived in `App.tsx` before this feature.

## Prerequisites

- `npm install` has been run.
- Simulator or physical device available for at least one of the supported targets.

## Run the app

Pick a target:

```bash
npm run ios            # any iOS simulator that's already booted, or Expo prompts
npm run ios:iphone     # iPhone 15 simulator
npm run ios:ipad       # iPad Pro 11-inch (M4) simulator
npm run android        # any Android emulator that's already booted, or Expo prompts
npm run android:phone  # boots Pixel_7 AVD, then attaches
npm run android:tablet # boots Pixel_Tablet AVD, then attaches
npm run web            # browser
```

## Manual verification (acceptance scenarios)

Execute the three acceptance scenarios from `spec.md`:

1. **Cold launch lands in Edit mode.**
   - Force-quit the app if it's running.
   - Launch via one of the commands above.
   - Expected: a header bar spans the top of the screen with a "Perform" button on its left. Below the header the body is empty or shows a neutral placeholder. The theme is dark.
   - Pass criterion: the "Perform" button is visible and tappable immediately on first render.

2. **Edit → Perform transition.**
   - Tap the "Perform" button.
   - Expected: the screen immediately becomes black, the header bar disappears, and an "x" close control appears in the top-left corner.
   - Pass criterion: transition feels instant (under 100ms); no loading indicator; no fade or blocking animation.

3. **Perform → Edit transition.**
   - From Perform mode, tap the "x" control.
   - Expected: the Edit-mode header bar reappears. The "x" is no longer visible.
   - Pass criterion: same instantaneity as above.

## Edge-case spot checks

- **Rotation**: Enter Perform mode, rotate the device (iOS simulator: ⌘ + ←/→; Android emulator: rotate via the toolbar). The "x" MUST stay in the top-left of the new orientation; the background MUST stay black.
- **Backgrounding**: Enter Perform mode, send the app to background (iOS simulator: ⌘ + H; Android: Home button), bring it back to foreground. Mode MUST be preserved (you return to black + "x").
- **Cold launch from Perform**: Enter Perform mode, force-quit the app, relaunch. You MUST land in Edit mode.
- **Keyboard navigation** (simulator with connected keyboard, or web): Tab MUST reach both the "Perform" button (in Edit mode) and the "x" control (in Perform mode), with a visible focus ring; Enter or Space MUST activate the focused control.

## Automated verification

```bash
npx jest                         # runs the full suite
npx jest __tests__/app           # just the shell / mode surfaces
npx jest __tests__/mode          # just the context
```

All test files listed in `contracts/ui-surfaces.md` MUST pass.

## Troubleshooting

| Symptom                                              | Likely cause                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Black screen with no "x" on cold launch              | Mode was persisted somewhere (it shouldn't be). Verify `ModeProvider` initializes to `'edit'`. |
| "Perform" button is greyed out / unresponsive        | `ModeProvider` is not wrapping `Shell`, or the button's `onPress` is missing. |
| Transition feels laggy (>100ms)                      | A parent component is doing heavy work on render. Check for unnecessary re-renders upstream of `Shell`. |
| Keyboard Tab doesn't reach the "x"                   | Missing `accessible` / `accessibilityRole="button"` / `focusable` props on the Pressable. |
