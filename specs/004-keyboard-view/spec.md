# Feature Specification: Keyboard Display Component

**Feature Branch**: `004-keyboard-view`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Create a component that displays a keyboard. Props are: low and high keys (as MIDI note numbers), and a list of keys to highlight (color blue). Low and high keys must be white keys. The component should expand to fill its width. Add storybook and make stories for this component."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Render a keyboard with a defined range and highlighted keys (Priority: P1)

A developer building an editor surface in Cadenza needs a reusable visual representation of a piano keyboard that takes a MIDI note range (low + high, both white keys) and a set of highlighted notes, and renders a traditional piano layout sized to fill its container's width, with the highlighted keys drawn in blue.

**Why this priority**: This is the core deliverable. All subsequent features that show keyboard information on-screen (Setup ranges, Cue patch mappings, Trigger note assignments, etc.) depend on it. Without this component there is no way to express "these are the keys that matter" visually in the product.

**Independent Test**: Render the component with a specific low/high (e.g., MIDI 48 = C3 to MIDI 72 = C5) and a list of highlighted keys (e.g., [60, 64, 67] — a C-major chord including Middle C). Verify: (a) the keyboard spans the full width of its container, (b) every note from 48 through 72 inclusive is visible as a white or black key in its expected position, (c) the three highlighted notes appear blue while all others are shown in their normal neutral colors, (d) resizing the container's width resizes the keyboard without clipping or overflow.

**Acceptance Scenarios**:

1. **Given** a container 600 pt wide and props `low = 48`, `high = 72`, `highlighted = []`, **When** the component renders, **Then** the keyboard fills the container's width, shows a standard two-octave layout (C3 to C5), and no key is blue.
2. **Given** props `low = 48`, `high = 72`, `highlighted = [60]`, **When** the component renders, **Then** exactly one key (Middle C) is drawn in blue and every other key is drawn in its normal color.
3. **Given** a wider container (e.g., 1000 pt), **When** the same props render, **Then** each key grows proportionally wider and the overall layout fills the new width; aspect and ordering are preserved.
4. **Given** props `low = 60` (a black key at first glance — but 60 is Middle C, a white key) or `low = 62` (another white key), **When** the component renders, **Then** it renders cleanly starting at that white key. **Given** props `low = 61` (C#, a black key), the component treats the input as a programming error and MAY either fail to render or render a developer-visible error indicator — the spec does not require graceful recovery.
5. **Given** props `highlighted = [100]` when `low = 48, high = 72`, **When** the component renders, **Then** the out-of-range highlight is silently ignored (no error, no visible effect); in-range highlights still render correctly.
6. **Given** props `highlighted` containing both white and black keys (e.g., `[60, 61, 62]` — Middle C, C#, D), **When** the component renders, **Then** all three are drawn blue regardless of color family.
7. **Given** the app is in dark mode (the only supported theme), **When** the component renders, **Then** white keys use a light neutral tone and black keys use a dark tone, both chosen to remain legible against Cadenza's dark surface; the blue highlight meets WCAG AA contrast against both neutral tones.

---

### User Story 2 — Browse the component in an isolated component workshop (Priority: P2)

A developer maintaining or styling the keyboard component needs a way to view it in isolation — outside of any screen that uses it — with different prop combinations, so they can iterate on visuals and catch regressions without navigating the running app.

**Why this priority**: The component will be reused across future features (Setup / Patches / Cues), and getting its visuals right in advance saves churn later. P2 because the component itself (US1) is the primary deliverable; a component workshop is a developer-convenience layer that can be added now or skipped for an initial ship.

**Independent Test**: Launch the component workshop and select each story in turn. Verify: (a) the keyboard component renders for every story with the story's specified props, (b) stories cover at least the primary prop combinations enumerated below, (c) switching stories does not leave state from a prior story on screen, (d) no story errors or fails to render.

**Acceptance Scenarios**:

1. **Given** the component workshop is running, **When** the developer selects the "Full 88-key piano" story, **Then** a keyboard from A0 (MIDI 21) to C8 (MIDI 108) renders across the full available width.
2. **Given** the workshop is running, **When** the developer selects the "C major chord" story, **Then** a keyboard with a modest range renders with three keys highlighted in blue (the chord tones).
3. **Given** the workshop is running, **When** the developer selects the "Empty highlights" story, **Then** the keyboard renders with no blue keys.
4. **Given** the workshop is running, **When** the developer selects the "Narrow container" story, **Then** the component still fills the (now narrow) container width, all keys remain visible, and the layout adapts.
5. **Given** any story is active, **When** the developer changes an interactive control (if the workshop supports prop knobs), **Then** the keyboard re-renders with the new prop values.

---

### Edge Cases

- **Low or high is a black key**: Spec constraint is "Low and high keys must be white keys." This is a programming contract, not a user input. The component is not required to recover gracefully — callers MUST pass white keys. A developer-visible indicator (e.g., a console warning, or render of an error placeholder) is acceptable but not required.
- **Low equals high, or low > high**: Either is a programming error. The component MAY render a single key (when `low === high`) or an empty/error state (when `low > high`), but is not required to. The spec's minimum is "behave predictably — do not crash."
- **Range at the extremes of MIDI (0 or 127)**: Valid inputs. MIDI note 0 is C-1 (a white key); MIDI 127 is G9 (also a white key). The component MUST render these without clipping.
- **Very wide range on a narrow container** (e.g., full 88 keys at 320 pt): the component must still render every key without clipping; individual keys may be thin but still present and distinguishable.
- **Very narrow range on a very wide container** (e.g., `low = 60, high = 62` — two white keys — at 2000 pt): each key becomes large. This is aesthetically unusual but not an error.
- **Highlighted list contains duplicates** (e.g., `[60, 60, 60]`): deduplication is implicit — the key is either highlighted or not.
- **Highlighted list contains out-of-range notes**: silently ignored per FR-006.
- **Highlighted list is very large** (e.g., all 128 MIDI notes): in-range entries are highlighted; out-of-range entries ignored. Performance must remain responsive.
- **Dark-mode only**: no light-theme variant is expected; the component renders one theme (dark).
- **Screen rotation or container resize**: the component must re-lay out to the new width without visual artifacts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The component MUST render a horizontal piano-style keyboard spanning MIDI notes from `low` through `high` inclusive.
- **FR-002**: The component MUST accept three inputs: a low boundary (a MIDI note number representing a white key), a high boundary (a MIDI note number representing a white key), and a list of MIDI note numbers to highlight.
- **FR-003**: The caller is contractually required to pass white keys as the low and high boundaries. The component is NOT required to recover gracefully when a black key is passed — this is a programming error, not a user input.
- **FR-004**: White keys MUST be drawn in the traditional piano layout (seven white keys per octave). Black keys MUST be drawn overlapping the junctions between specific adjacent white keys, at a reduced width and vertical height, in their traditional positions.
- **FR-005**: Every MIDI note from `low` to `high` inclusive (white AND black) MUST appear as a visible key in the rendered output.
- **FR-006**: Keys whose MIDI note number appears in the highlighted list MUST be drawn in blue. Keys whose note is NOT in the list MUST be drawn in the component's normal neutral tones (a light tone for white keys, a dark tone for black keys). Highlighted notes that fall outside `[low, high]` MUST be silently ignored.
- **FR-007**: The component MUST expand to fill the full width of its container. Individual key widths are computed from the container width and the number of white keys in the range.
- **FR-008**: The component's rendered height MUST be proportional to its width so the keyboard keeps a recognizable piano aspect ratio at any width.
- **FR-009**: The blue highlight color MUST meet WCAG AA contrast against both the white-key neutral and the black-key neutral, so a highlighted black key remains unambiguously distinguishable from an unhighlighted black key.
- **FR-010**: The component MUST render correctly on both tablet and phone layouts. It does not itself choose a different rendering per layout — it simply fills whatever width it is given.
- **FR-011**: Changing any prop (low, high, or highlighted list) MUST re-render the keyboard on the next render pass with the new state. No internal caching may prevent updates from taking effect.
- **FR-012**: The component MUST be a pure display surface — it MUST NOT play audio, emit MIDI, or respond to tap events in this feature. Interactivity, if added later, will be a separate feature.
- **FR-013**: A stories-workshop deliverable MUST ship alongside the component, containing at minimum one story per scenario enumerated in the Key Stories section below. Each story MUST render without errors and demonstrate the stated prop combination.

### Key Stories (stories to ship with the component)

The workshop MUST include at least these stories:

1. **Full 88-key piano** — `low = A0 (21)`, `high = C8 (108)`, `highlighted = []`. Shows the full standard-piano range.
2. **Middle C highlighted** — `low = C3 (48)`, `high = C5 (72)`, `highlighted = [60]`. Single white-key highlight.
3. **C major chord highlighted** — same range, `highlighted = [60, 64, 67]`. Multiple white-key highlights.
4. **Chromatic selection** — same range, `highlighted = [60, 61, 62, 63, 64]`. Mixed white and black highlights.
5. **Empty highlights** — same range, `highlighted = []`. Baseline visual.
6. **One-octave range** — `low = C4 (60)`, `high = C5 (72)`, `highlighted = [60, 72]`. Shows the root-and-octave highlighting pattern.
7. **Narrow container** — any range, rendered inside a width-constrained container (e.g., 320 pt). Verifies fill-to-width behavior at small sizes.
8. **Wide container** — same story but inside a width-unconstrained container (e.g., 1000 pt). Verifies fill-to-width at large sizes.

### Key Entities

- **Keyboard Range**: A pair of MIDI note numbers `(low, high)` where `low <= high` and both correspond to white keys. Represents the range of notes the rendered keyboard covers.
- **Highlighted Note**: A MIDI note number (0–127) that, when present in the range `[low, high]`, is drawn blue instead of its normal tone. Position and color family (white/black) of the note do not affect its eligibility for highlighting.
- **Key**: The atomic rendered element — one per MIDI note in `[low, high]` — with attributes: note number, color family (white/black), highlighted yes/no.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can drop the component into a layout, pass a range and a list of highlights, and see the expected keyboard — on first integration, with no iteration required — for 100% of the cases enumerated in the Key Stories section.
- **SC-002**: When the container's width changes (e.g., orientation change, split-view resize), the keyboard re-lays out within one visual frame (≤ 16.7 ms on 60 Hz) with no flicker, gap, or overflow.
- **SC-003**: A highlighted key is visually distinguishable from an unhighlighted key at any container width ≥ 200 pt. The blue highlight stands out against both white and black key neutrals with a contrast ratio of at least 4.5:1 (WCAG AA).
- **SC-004**: The component renders a full 88-key piano (the widest common range) inside a 320 pt container with every key still visible and identifiable — no key is drawn at zero width, no key overlaps another incorrectly, and black keys remain visually distinct from white keys.
- **SC-005**: The stories workshop contains at least eight stories (one per the Key Stories list) and each one renders without error.
- **SC-006**: Changing a prop value via workshop controls (if supported) causes the keyboard to re-render the new state within one visual frame.

## Assumptions

- **Scope is display-only**: this feature delivers a visual component. Hit testing, sound output, or pointer tracking for playing notes are explicitly out of scope. A later feature may add interactivity.
- **Dark mode only**: the component ships one theme — the dark theme already used throughout the app. "White" keys are rendered with a light neutral appropriate against the dark surface; "black" keys with a dark neutral.
- **Blue color**: the highlighted key blue is a specific blue chosen for WCAG AA contrast against both the white-key and black-key neutrals. Whether it reuses an existing app token (e.g., the primary accent) or introduces a new keyboard-specific token is a plan-level decision.
- **Out-of-range highlights are ignored**: they are not an error condition. This lets callers pass a stable list (e.g., "all held notes") even if some fall outside the rendered range.
- **White-key boundary contract**: callers are responsible for ensuring `low` and `high` map to white keys. The component does NOT coerce black-key boundaries to the nearest white key, nor does it throw. Behavior on black-key input is implementation-defined within "does not crash."
- **Aspect ratio**: the keyboard keeps a traditional piano aspect — black keys shorter than white keys, seven white keys per octave, five black keys per octave. Exact pixel aspect (e.g., key height relative to width) is a design-level choice.
- **Performance target**: a 128-key render (the absolute maximum) re-lays out within one frame on target hardware. Typical ranges (two to eight octaves) should feel instant.
- **Stories workshop is a development-only artifact**: it does not ship in the production app binary; it is a developer surface for previewing the component. Exactly how the workshop is structured (in-app entry point, separate build target, web-based preview, etc.) is a plan-level decision.
