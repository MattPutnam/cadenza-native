# cadenza-native Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-19

## Active Technologies
- TypeScript ~5.9 (strict); native code Swift (iOS) + Kotlin (Android) inside the local Expo module. + React Native 0.81.5, Expo SDK ~54 (existing). **New:** `expo-dev-client` (replaces Expo Go for our dev builds), `@react-native-async-storage/async-storage` (preferences persistence), a local Expo native module `modules/expo-cadenza-midi` (custom, not from npm). The existing `react-native-safe-area-context` and `@expo/vector-icons` are reused. (002-midi-input-and-preferences)
- `AsyncStorage` key `cadenza.preferences.v1` holding a JSON blob of the user's preferences. Preferences are the only persisted state introduced by this feature. MIDI messages and device state are in-memory only. (002-midi-input-and-preferences)

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
- 002-midi-input-and-preferences: Added TypeScript ~5.9 (strict); native code Swift (iOS) + Kotlin (Android) inside the local Expo module. + React Native 0.81.5, Expo SDK ~54 (existing). **New:** `expo-dev-client` (replaces Expo Go for our dev builds), `@react-native-async-storage/async-storage` (preferences persistence), a local Expo native module `modules/expo-cadenza-midi` (custom, not from npm). The existing `react-native-safe-area-context` and `@expo/vector-icons` are reused.

- 001-app-shell-modes: Added TypeScript ~5.9 (strict mode) + React Native 0.81.5, Expo SDK ~54.0.33, React 19.1, expo-status-bar ~3.0.9. `@expo/vector-icons` (ships with Expo) for the "x" close glyph. `react-native-web` 0.21.x is present in `dependencies` but is not exercised by this feature.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
