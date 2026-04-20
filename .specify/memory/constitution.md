<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: MINOR — two new principles added (VI. Touch-First Performer UX,
VII. Focused Accessibility) codifying the UX/UI rules in docs/design.md. No
existing principles were removed or redefined, and no governance process
changed. Added a brief "UX Design Reference" pointer under Platform &
Technology Constraints so the design doc is discoverable from the constitution.

Principles added:
  - VI. Touch-First Performer UX
  - VII. Focused Accessibility

Principles renamed / removed: none.

Sections added: none at top level. Updated "Platform & Technology Constraints"
with a pointer to docs/design.md and docs/glossary.md as the canonical
references for UX and domain terminology.

Templates and docs reviewed for alignment:
  - .specify/templates/plan-template.md      ✅ compatible (Constitution Check placeholder remains open; no edits needed)
  - .specify/templates/spec-template.md      ✅ compatible (domain-agnostic)
  - .specify/templates/tasks-template.md     ✅ compatible (Principles VI/VII apply to UI tasks but do not require new task categories)
  - .specify/extensions.yml                  ✅ unchanged (still enforces Principle V)
  - README.md                                ✅ no change required (product overview)
  - docs/design.md                           ✅ source material — cited from constitution, no change
  - docs/glossary.md                         ✅ reference — cited from constitution, no change

Deferred / TODO: none.
-->

# Cadenza Constitution

## Core Principles

### I. Reliability During Performance (NON-NEGOTIABLE)

Cadenza runs on stage during live musical theatre performances. A crash, freeze, or
unhandled error between cues is a show-stopping failure with no recovery path.
Every feature MUST therefore:

- Degrade gracefully when inputs, hardware, or storage are unavailable (e.g., a
  missing MIDI device, a corrupt patch file, a failed PDF render) — the current
  cue MUST continue to function even if the failing component is unrelated.
- Never block, throw, or allocate on the input-to-MIDI-output path during a cue.
- Surface recoverable errors through non-modal UI that does not interrupt the
  performer's ability to advance the next cue.
- Persist state changes (edits, cue advances) with enough durability that an app
  restart mid-show can resume at the current song and cue.

**Rationale:** MainStage's primary failure mode — unpredictable runtime issues
during a show — is the motivating reason Cadenza exists. Tolerating the same
class of failure defeats the product.

### II. Real-Time MIDI Path Integrity

The path from input event (key press, pedal, arrow key, remote trigger) to MIDI
output (note, CC, program change, patch load) is the product's hot path.

- Input-to-output MIDI latency MUST remain imperceptible to the performer under
  normal load; any work beyond event dispatch, remap resolution, and MIDI send
  MUST happen off this path.
- Features that must do heavier work (PDF rendering, file I/O, waveform display,
  background sync) MUST run on separate threads/queues and MUST NOT share locks
  with the MIDI dispatch path.
- Trigger, remap, ghost-note, and glissando resolution MUST be deterministic:
  given the same input and scope (global / song / cue / patch), the output MUST
  be identical and reproducible in tests.

**Rationale:** Latency or jitter in live MIDI is immediately audible and
unforgivable; determinism is what makes the behavior testable at all.

### III. Hardware-First Sound Architecture

Cadenza drives external or onboard hardware synthesizers (digital pianos, JV-1080
and similar modules). It does NOT perform software synthesis.

- No feature may introduce an in-app audio synthesis engine, sampler, or internal
  audio graph intended to produce the performance's sound.
- Sound-shaping features (patch selection, layering, split, transposition, ghost
  notes, glissandos) MUST be expressed as outbound MIDI events to external
  devices, not as internal audio rendering.
- Audio output from the device itself (e.g., metronome clicks for the performer,
  UI feedback sounds) is permitted only when it cannot be confused with the
  performance signal and is routed so it never reaches the house mix.

**Rationale:** The product's positioning, mobile target, and reliability profile
all depend on this boundary. Crossing it turns Cadenza into a worse MainStage.

### IV. Test-First for Stage-Affecting Logic

Any logic whose behavior is observable on stage — trigger dispatch, cue advance,
patch/song loading, control remap resolution at each scope, ghost-note
expansion, glissando transposition, MIDI message construction — MUST have
automated tests written before or alongside implementation, and those tests
MUST fail prior to the implementation landing.

- Test-first applies to **behavior visible on stage**, not to every screen, view,
  or ephemeral UI detail. Chrome, layout, and editor-only surfaces are exempt.
- Pure-UI tests (snapshot, layout) do NOT satisfy this requirement for
  stage-affecting logic; behavioral tests at the logic or integration level do.
- Bug fixes for stage-affecting logic MUST include a regression test that fails
  without the fix.

**Rationale:** A performer cannot catch regressions by eye during a show. If it
affects what the audience hears, a machine must be able to verify it.

### V. Spec-Driven, Feature-Branch Development

All feature work MUST flow through the speckit workflow: a specification under
`/specs/NNN-feature-name/` authored on a dedicated feature branch, followed by a
plan, tasks, and implementation on that same branch.

- Feature branches MUST be created via the `speckit.git.feature` extension (the
  mandatory `before_specify` hook) so numbering and naming stay consistent.
- Direct commits to `main` / `master` for feature work are prohibited. Hotfix
  branches for production-blocking bugs are permitted but MUST still carry a
  retroactive spec entry before the next release.
- The Constitution Check gate in `plan-template.md` MUST be evaluated before any
  research or design phase; violations require either redesign or an entry in
  the plan's Complexity Tracking table with an explicit justification.

**Rationale:** Musical-theatre-specific behavior is subtle and easy to get
almost-right. Forcing every feature through a written spec, on an isolated
branch, keeps the domain reasoning visible and the history auditable.

### VI. Touch-First Performer UX

Cadenza's interface targets performing musicians operating a tablet (primary)
or phone (secondary) on a music stand, typically in dim light, often with only
moments free between passages. All UI design MUST assume a touch interface.

- Hit targets MUST be sized for finger use (no stylus- or cursor-sized
  controls), hover states are prohibited as a means of conveying information or
  affordance, and no action that a performer may need during a show may require
  a multi-touch gesture.
- Tablet layouts are the reference design. Phone layouts MAY present the same
  information more compactly (text lists in place of graphical keyboard or
  channel maps, fewer simultaneous panels) and MAY omit advanced editor
  surfaces, but MUST retain functional parity for anything reachable from
  performance mode.
- Dark mode is the only supported theme. No light-mode surfaces may ship, and
  all colors MUST remain legible and non-glaring in orchestra-pit darkness.
- Desktop builds, if produced, inherit the touch/tablet design unchanged; no
  desktop-specific UI work is in scope and desktop-only affordances (right
  click menus, hover tooltips) MUST NOT be introduced as the sole path to a
  feature.

**Rationale:** The target environment is a darkened orchestra pit with a tablet
on a music stand. Design choices that optimize for pointer input, hover states,
bright rooms, or light themes actively fail the user.

### VII. Focused Accessibility

Cadenza's users are sighted keyboardists with high manual dexterity operating
in live performance. Accessibility requirements therefore target the assistive
pathways those users actually use, not a generic checklist:

- Screen-reader / VoiceOver / TalkBack support is NOT required. Semantic
  labelling is encouraged where cheap, but features are not gated on it.
- Physical keyboard operation MUST work wherever a performer or editor might
  reasonably use one: focus cycles MUST be logical, every actionable control
  reachable via performance-mode input MUST be reachable via keyboard, and
  focus states MUST be clearly visible against the dark-mode background.
- Color contrast MUST meet WCAG AA for performance-mode text and controls, and
  no information MUST be conveyed by color alone — shape, label, or position
  MUST also distinguish it — so color-deficient users retain full function.

**Rationale:** Narrowing the accessibility scope to what the real user base
depends on lets the team invest meaningfully in the pieces that matter
(keyboard navigation, contrast, color-blind safety) rather than spreading thin
across surfaces no one uses.

## Platform & Technology Constraints

- **Runtime targets:** iOS and Android. Feature parity across both is the
  default; any platform-only capability MUST be justified in the feature's spec.
- **Client framework:** React Native with Expo. Native modules are acceptable
  where the JS bridge cannot meet Principle II (e.g., CoreMIDI / Android MIDI
  access, low-latency input), and MUST be isolated behind a typed interface so
  the rest of the app remains platform-neutral.
- **MIDI I/O:** Performed via platform MIDI APIs (CoreMIDI on iOS, the Android
  MIDI API, and/or Bluetooth MIDI). Software synthesis is prohibited per
  Principle III.
- **Offline operation:** The app MUST be fully usable with no network
  connectivity. Network features (sync, backup, sharing) are optional
  enhancements and MUST NOT be on any critical performance path.
- **Data persistence:** Show data (songs, cues, patches, triggers, remaps,
  imported PDFs) MUST be stored locally on-device and survive app restarts and
  OS upgrades without data loss.
- **UX design reference:** `docs/design.md` is the canonical source for UI
  design rules that extend Principles VI and VII (touch targets, tablet-vs-
  phone layout, dark mode, accessibility scope). `docs/glossary.md` is the
  canonical source for domain terminology (Keyboard, Synthesizer, Bank,
  Channel, Patch, Cue, Trigger); specs, plans, and code MUST use these terms
  consistently.

## Development Workflow & Quality Gates

- **Specs:** Every feature begins with a spec created via `/speckit.specify` on
  a feature branch. Specs MUST describe user-visible behavior in terms a
  musical-director or keyboardist would recognize, not in framework terms, and
  MUST use glossary terminology.
- **Plans:** Every plan MUST include a Constitution Check that explicitly
  evaluates all seven principles above. Violations MUST either be resolved or
  documented in Complexity Tracking.
- **Code review:** PRs MUST link their spec directory and MUST NOT merge if any
  stage-affecting logic lacks the tests required by Principle IV, or if any
  user-facing surface violates Principles VI or VII without a documented
  exception.
- **Releases:** Any change to MIDI dispatch, trigger resolution, cue advance, or
  patch loading MUST be validated end-to-end against a physical MIDI device (or
  a recorded-fixture harness derived from one) before release.

## Governance

This constitution supersedes ad-hoc conventions and informal preferences.
Conflicts between this document and other guidance MUST be resolved in favor of
this document, or by amending this document.

- **Amendments** are made by editing this file on a feature branch, following
  the same speckit workflow as any other change. The PR description MUST state
  the bump type (MAJOR / MINOR / PATCH) and the reasoning.
- **Versioning policy:**
  - MAJOR — a principle is removed, redefined in a backward-incompatible way,
    or the governance process itself changes incompatibly.
  - MINOR — a new principle or section is added, or existing guidance is
    materially expanded.
  - PATCH — clarifications, wording fixes, or non-semantic refinements.
- **Compliance review:** Every plan's Constitution Check is the primary
  compliance gate. Reviewers MUST reject PRs that violate a principle without an
  accepted Complexity Tracking entry.
- **Runtime guidance:** Day-to-day implementation guidance that is not
  constitutional in nature belongs in `README.md`, `docs/`, or feature-specific
  docs under `/specs/…/`, not in this file.

**Version**: 1.1.0 | **Ratified**: 2026-04-19 | **Last Amended**: 2026-04-19
