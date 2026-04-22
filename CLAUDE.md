# cadenza-native Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-22

## Active Technologies
- TypeScript ~5.9 (strict); native code Swift (iOS) + Kotlin (Android) inside the local Expo module. + React Native 0.81.5, Expo SDK ~54 (existing). **New:** `expo-dev-client` (replaces Expo Go for our dev builds), `@react-native-async-storage/async-storage` (preferences persistence), a local Expo native module `modules/expo-cadenza-midi` (custom, not from npm). The existing `react-native-safe-area-context` and `@expo/vector-icons` are reused. (002-midi-input-and-preferences)
- `AsyncStorage` key `cadenza.preferences.v1` holding a JSON blob of the user's preferences. Preferences are the only persisted state introduced by this feature. MIDI messages and device state are in-memory only. (002-midi-input-and-preferences)
- TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `react-native-safe-area-context` and `@expo/vector-icons` (existing) are reused. **No new npm dependencies.** (003-edit-view-nav)
- None. The Edit sub-view selection is session-scoped in-memory state only (per spec FR/assumptions). (003-edit-view-nav)
- TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). **New (dev-only):** `@storybook/react-native` (~8.x) and its required peer deps. Exact peer-dep list and install commands are pinned in research.md §2. No new runtime (non-dev) dependencies. No `react-native-svg`, no icon-library additions. (004-keyboard-view)
- None. The keyboard component is stateless. Storybook persists its own last-selected-story index via AsyncStorage (already installed for feature 002). (004-keyboard-view)
- TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `@react-native-async-storage/async-storage` (installed in feature 002), `react-native-safe-area-context` (existing), `@expo/vector-icons` (existing, used for warning / close / chevron glyphs). **No new npm dependencies.** (005-setup-keyboards)
- `AsyncStorage` key `cadenza.keyboards.v1` holding a JSON blob of the Keyboards array. First-launch read miss → synthesise a single 88-key Keyboard in memory and persist on next change. Failure-safe same as feature 002's preferences pattern. (005-setup-keyboards)

- TypeScript ~5.9 (strict mode) + React Native 0.81.5, Expo SDK ~54.0.33, React 19.1, expo-status-bar ~3.0.9. `@expo/vector-icons` (ships with Expo) for the "x" close glyph. `react-native-web` 0.21.x is present in `dependencies` but is not exercised by this feature. (001-app-shell-modes)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript ~5.9 (strict mode): Follow standard conventions

## Recent Changes
- 005-setup-keyboards: Added TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `@react-native-async-storage/async-storage` (installed in feature 002), `react-native-safe-area-context` (existing), `@expo/vector-icons` (existing, used for warning / close / chevron glyphs). **No new npm dependencies.**
- 004-keyboard-view: Added TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). **New (dev-only):** `@storybook/react-native` (~8.x) and its required peer deps. Exact peer-dep list and install commands are pinned in research.md §2. No new runtime (non-dev) dependencies. No `react-native-svg`, no icon-library additions.
- 003-edit-view-nav: Added TypeScript ~5.9 (strict). No new native code. + React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `react-native-safe-area-context` and `@expo/vector-icons` (existing) are reused. **No new npm dependencies.**


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
