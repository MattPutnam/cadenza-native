# Implementation Plan: Setup Tab — Keyboard Configuration

**Branch**: `005-setup-keyboards` | **Date**: 2026-04-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-setup-keyboards/spec.md`

## Summary

Fill in the Setup tab (currently a `Setup` placeholder from feature 003) with a real Keyboards configuration surface. The user sees one pre-defined 88-key keyboard on first launch; can add, edit, or delete entries; assigns each multi-keyboard entry to a named MIDI input device plus (when devices are shared) a MIDI channel; optionally nicknames each entry. The Keyboards list persists across cold launches.

Technical approach:

- **State + persistence**: new `KeyboardsContext` mounted above `<Shell/>` in `App.tsx`, mirroring the `PreferencesContext` pattern — session-scoped in-memory state, backed by `AsyncStorage` under key `cadenza.keyboards.v1` with failure-safe load/save. CRUD exposed via `useKeyboards()` (`add`, `update`, `remove`, plus derived `keyboards` array).
- **Data model**: a `Keyboard` value type with `{ id, size (25|37|49|61|73|76|88), deviceName, channel, nickname }`. Pure helpers: `sizeToRange(size)` returns the fixed low/high pair, and `detectConflicts(keyboards)` returns the set of IDs involved in same-device-same-channel conflicts.
- **UI**: `SetupView.tsx` reads `useKeyboards()`, `useMidiInput().devices` (already exposed from feature 002), and `useLayoutMode()` (feature 003). On tablet, each keyboard renders as a **row** with the controls bar across the top and the `<Keyboard>` component (feature 004) below. On phone, each keyboard renders as a **card** containing only the controls. The controls include a Size dropdown always, a Device dropdown + Nickname field when multiple keyboards exist, and a Channel dropdown when multiple keyboards share a device.
- **Dropdowns**: one generic `<Dropdown />` component built on RN `Modal` (same pattern as `EditViewDropdown` in feature 003). Specialised callers pass option lists + change handlers. No third-party library.
- **No new native code or npm dependencies.** The MIDI subsystem already exposes `devices: readonly MidiDevice[]` via `useMidiInput()` (confirmed in `src/midi/MidiInputContext.tsx`), so no MidiInputContext changes are needed for this feature.

Integration with runtime MIDI routing (how configured keyboards inform message filtering or patch playback) is explicitly **out of scope** and deferred to the feature that consumes this setup.

## Technical Context

**Language/Version**: TypeScript ~5.9 (strict). No new native code.
**Primary Dependencies**: React Native 0.81.5, Expo SDK ~54, React 19.1 (existing). `@react-native-async-storage/async-storage` (installed in feature 002), `react-native-safe-area-context` (existing), `@expo/vector-icons` (existing, used for warning / close / chevron glyphs). **No new npm dependencies.**
**Storage**: `AsyncStorage` key `cadenza.keyboards.v1` holding a JSON blob of the Keyboards array. First-launch read miss → synthesise a single 88-key Keyboard in memory and persist on next change. Failure-safe same as feature 002's preferences pattern.
**Testing**: `jest-expo` + `@testing-library/react-native` (existing). New unit targets: `schema.test.ts` (size→range), `conflicts.test.ts` (pure conflict detection), `storage.test.ts` (load/save/fallback). New integration-level tests: `KeyboardsContext.test.tsx`, `Dropdown.test.tsx`, `SetupView.test.tsx` (tablet + phone layouts, device-warning states, conflict-warning states).
**Target Platform**: iOS 17+ (iPhone + iPad) and Android (phone + tablet). Web inherits the no-op MIDI adapter; the Setup tab will render but show `<No input detected>` forever on web (acceptable — web is not a target surface for this feature).
**Project Type**: mobile-app (Expo Dev Client).
**Performance Goals**:
- CRUD operations (`add`, `update`, `remove`) update the in-memory state synchronously and dispatch a save. Save completes asynchronously — the UI does not block.
- Conflict detection runs on every Keyboards array change. For reasonable N (≤ ~8 keyboards), detection is O(N²) and completes in well under one frame.
- Device-dropdown content derives from `useMidiInput().devices` + the Keyboard's persisted `deviceName`, so connect/disconnect events propagate on the next React render.
**Constraints**:
- **Principle I** — storage read/write failures degrade gracefully: load miss or parse error falls back to the default single-88-keyboard state (logged, non-modal). Write failure keeps the in-memory change effective and retries on next change.
- **Principle II** — no MIDI hot-path code touched. Device-list observation is already handled by `MidiInputContext` from feature 002.
- **Principle VI** — all controls have ≥ 44 pt / 48 dp hit targets; dark mode only; no hover states; no multi-touch; text input nickname uses the native keyboard (no custom gesture needed).
- **Principle VII** — every control is keyboard-reachable with a visible focus ring. Warning states (disconnected device, channel conflict) are conveyed by an icon + accessibility announcement in addition to color.
**Scale/Scope**: Up to ~8 keyboards per setup (practical ceiling; the MIDI 16-channel limit bounds most use cases). Roughly ~1200–1800 LOC across the keyboards module + SetupView + tests. No source-file deletions; the existing `src/app/SetupView.tsx` placeholder is replaced in-place.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against `constitution.md` v1.1.0.

### I. Reliability During Performance (NON-NEGOTIABLE) — **applicable, pass**

- Storage read/write: failures fall back to defaults (first-launch state); log and continue. Never blocks the UI, never throws.
- CRUD operations: synchronous state updates with async saves. A save failure keeps the in-memory state valid and retries on next change.
- Conflict detection: pure function, bounded O(N²) for small N. No recursion, no external calls.
- MIDI routing: unchanged. The Setup tab is a configuration surface; live MIDI routing enforcement is out of scope.
- Invalid persisted state (bad JSON, stale schema) degrades to the first-launch default rather than crashing.

### II. Real-Time MIDI Path Integrity — **applicable, trivially pass**

No MIDI dispatch code is touched. The feature consumes `useMidiInput().devices`, a read-only state subscription that already existed from feature 002. No new listeners or filters are added to the hot path.

### III. Hardware-First Sound Architecture — **not applicable**

No audio code. Trivially compliant.

### IV. Test-First for Stage-Affecting Logic — **not applicable (UI chrome)**

The Setup tab is editor-mode chrome. Per Principle IV's second bullet, editor surfaces are exempt from strict test-first. Tests are written anyway for the pure helpers (`sizeToRange`, `detectConflicts`), for storage load/save, and for the context's CRUD + persistence contract — cheap insurance against regressions once Patches / Cues start consuming this config.

### V. Spec-Driven, Feature-Branch Development — **applicable, pass**

Spec exists on `005-setup-keyboards`; plan lives on the same branch; tasks and implementation will stay on this branch until merged.

### VI. Touch-First Performer UX — **applicable, pass**

- **Hit targets**: every dropdown trigger, delete/add button, and text field row has ≥ 44 pt / 48 dp hit area.
- **No hover states**: dropdowns open on tap; focus ring for keyboard navigation only.
- **No multi-touch**: single-tap everywhere.
- **Dark mode only**: reuses existing tokens from `src/theme/colors.ts`; new tokens added for warning states if needed.
- **Tablet-first**: the reference design shows the `<Keyboard>` component per entry; the phone layout presents the same *information* more compactly (card without the keyboard visualization), satisfying the "MAY present more compactly" clause of Principle VI.

### VII. Focused Accessibility — **applicable, pass**

- **Keyboard reachability**: every control (dropdowns, text input, add/delete buttons) is in natural focus order with a visible focus ring from `colors.focusRing`.
- **State beyond color**: disconnected-device warnings use an icon glyph AND are reflected in `accessibilityState` / `accessibilityLabel`; channel conflicts render an explicit text message alongside the warning icon.
- **Contrast**: new warning colors (if any) meet WCAG AA; any additional tokens are verified in a Phase-6 task.
- **Screen-reader**: dropdowns and text inputs carry appropriate `accessibilityRole` / `accessibilityLabel`; warning state announces "disconnected" or "channel conflict" prefixes so assistive users aren't left guessing at the icon's meaning.

**Gate result (pre-Phase 0)**: PASS. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/005-setup-keyboards/
├── plan.md                      # This file
├── research.md                  # Phase 0 output
├── data-model.md                # Phase 1 output
├── quickstart.md                # Phase 1 output
├── contracts/                   # Phase 1 output
│   └── ui-surfaces.md
├── checklists/
│   └── requirements.md          # Created by /speckit.specify
└── tasks.md                     # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
App.tsx                              # UPDATE — mount <KeyboardsProvider> between ModeProvider and Shell

src/
├── keyboards/
│   ├── KeyboardsContext.tsx         # NEW — provider with load-on-mount, CRUD, save-on-change
│   ├── useKeyboards.ts              # NEW — consumer hook
│   ├── storage.ts                   # NEW — AsyncStorage read/save, failure-safe
│   ├── schema.ts                    # NEW — KEYBOARD_SIZES, sizeToRange, default state
│   ├── conflicts.ts                 # NEW — pure: detectConflicts(keyboards) → Set<id>
│   ├── types.ts                     # NEW — Keyboard, KeyboardSize, StoredSetup
│   ├── Dropdown.tsx                 # NEW — generic dropdown (Modal + backdrop + items)
│   ├── KeyboardControls.tsx         # NEW — controls row: size / device / channel / nickname
│   ├── KeyboardRow.tsx              # NEW — tablet layout: controls row + <Keyboard>
│   └── KeyboardCard.tsx             # NEW — phone layout: controls in a card, no <Keyboard>
├── app/
│   ├── SetupView.tsx                # UPDATE — replace placeholder; render rows/cards + Add button
│   ├── PatchesView.tsx              # UNCHANGED
│   ├── CuesView.tsx                 # UNCHANGED
│   ├── EditMode.tsx                 # UNCHANGED
│   ├── Shell.tsx                    # UNCHANGED
│   ├── PerformMode.tsx              # UNCHANGED
│   ├── EditViewBody.tsx             # UNCHANGED
│   ├── EditViewSegmented.tsx        # UNCHANGED
│   ├── EditViewDropdown.tsx         # UNCHANGED
│   └── EditViewHeaderControl.tsx    # UNCHANGED
├── theme/
│   └── colors.ts                    # UPDATE — add warning color tokens if needed
├── keyboard/                        # UNCHANGED (the display component from feature 004)
├── midi/                            # UNCHANGED
├── mode/                            # UNCHANGED
├── prefs/                           # UNCHANGED
├── edit-view/                       # UNCHANGED
└── layout/                          # UNCHANGED

__tests__/
└── keyboards/
    ├── schema.test.ts               # NEW — size→range table, white-key invariant
    ├── conflicts.test.ts            # NEW — conflict detection edge cases
    ├── storage.test.ts              # NEW — load/save/fallback (AsyncStorage mock)
    ├── KeyboardsContext.test.tsx    # NEW — default state, CRUD, persistence, last-delete block
    ├── Dropdown.test.tsx            # NEW — generic dropdown behavior
    └── SetupView.test.tsx           # NEW — tablet + phone layouts, warning states, conflict states
```

**Structure Decision**: Single-project layout (Option 1), consistent with features 001–004. The new `src/keyboards/` sibling directory holds the domain state, helpers, and feature-specific UI primitives; `src/app/SetupView.tsx` (the thin screen component) is updated in place to consume them. The existing `src/keyboard/` (display component from feature 004) remains untouched — singular vs. plural disambiguates: `src/keyboard/` is "the keyboard visual," `src/keyboards/` is "the user's configured keyboards."

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No principle violations. The entries below surface design choices that reviewers should see explicitly:

| Choice | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Separate `src/keyboards/` directory for domain state + feature UI, co-located with a generic `Dropdown` component | The feature spans persistence, pure helpers, and several UI components with shared concerns (warning states, conflict highlighting, layout switching). Keeping them together matches the per-concern layout already used by `prefs/`, `edit-view/`, `layout/`. | A single `SetupView.tsx` with all state and components inline would balloon beyond a reasonable file size (~1500 LOC) and mix persistence / pure logic / UI — harder to test in isolation. |
| Local `Dropdown` component in `src/keyboards/` rather than extracting a shared `src/ui/Dropdown` on first use | YAGNI: only this feature needs a generic dropdown beyond the existing `EditViewDropdown` (which is specialised for the Edit-mode view menu). Extracting prematurely risks a wrong abstraction when a second consumer's requirements differ. | A shared `src/ui/Dropdown` is the right destination eventually, but we only have two real candidates so far (EditView, here). When the third need appears, extract with knowledge of all call sites. |
| Keep the storage schema minimal (name + channel + nickname + size) with no device ID, per spec FR-013 | The spec mandates storing by name so reconnection works across same-make/model hardware. Including the device ID would let name matching silently drift from what the user expects. | Storing both name AND ID would allow fancier reconnect heuristics but complicates the data model and contradicts the spec's explicit "stored by name" rule. |
| Mount `KeyboardsProvider` in `App.tsx` rather than inside `SetupView.tsx` | The keyboards config will be consumed by later features (Patches, Cues, runtime routing). Lifting the provider to App-level now means those features can mount subscribers without any further restructuring. | Keeping it inside `SetupView` ties the lifetime of the config to the Setup screen — consumers outside that screen would lose access when the user navigates away. |

**Re-check after Phase 1 design**: evaluated against the data model, UI surfaces contract, research decisions, and quickstart. No new principle exposures:

- **Principle I** — storage failure modes pinned in data-model.md §Provider invariants and research.md §3. Conflict detection is pure and cannot throw.
- **Principle II** — MIDI path unchanged; device-list consumption is a subscription to existing context state.
- **Principle III** — no audio code.
- **Principle IV** — editor surface; tests written for pure helpers + context + UI contract per the Project Structure table.
- **Principle V** — branch / spec / plan layout satisfies this.
- **Principle VI** — hit targets, touch-only inputs, dark mode, tablet-reference with phone compaction are all pinned in contracts/ui-surfaces.md.
- **Principle VII** — focus order, visible focus ring, warning-state non-color cues (icons + labels), and contrast verification all captured in contracts/ui-surfaces.md.

**Gate result (post-Phase 1)**: PASS.
