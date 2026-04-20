<!--
Sync Impact Report
==================
Version change: (uninitialized template) → 1.0.0 (initial ratification)
Bump rationale: First concrete ratification of the constitution. The previous
file contained only placeholder tokens; all sections are being filled for the
first time, so semantic versioning starts at 1.0.0.

Principles added (none removed):
  - I. Reliability During Performance (NON-NEGOTIABLE)
  - II. Real-Time MIDI Path Integrity
  - III. Hardware-First Sound Architecture
  - IV. Test-First for Stage-Affecting Logic
  - V. Spec-Driven, Feature-Branch Development

Sections added:
  - Platform & Technology Constraints
  - Development Workflow & Quality Gates
  - Governance

Sections removed: none.

Templates and docs reviewed for alignment:
  - .specify/templates/plan-template.md              ✅ compatible (Constitution Check gate retained; no edits needed)
  - .specify/templates/spec-template.md              ✅ compatible (domain-agnostic; no edits needed)
  - .specify/templates/tasks-template.md             ✅ compatible (tests marked optional per template; Principle IV
                                                         narrows this for stage-affecting logic but does not require
                                                         template changes)
  - .specify/extensions.yml                          ✅ aligned (before_specify → speckit.git.feature enforces Principle V)
  - README.md                                        ✅ no change required (product overview, not governance)

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

## Development Workflow & Quality Gates

- **Specs:** Every feature begins with a spec created via `/speckit.specify` on
  a feature branch. Specs MUST describe user-visible behavior in terms a
  musical-director or keyboardist would recognize, not in framework terms.
- **Plans:** Every plan MUST include a Constitution Check that explicitly
  evaluates the five principles above. Violations MUST either be resolved or
  documented in Complexity Tracking.
- **Code review:** PRs MUST link their spec directory and MUST NOT merge if any
  stage-affecting logic lacks the tests required by Principle IV.
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
  constitutional in nature belongs in `README.md` or feature-specific docs
  under `/specs/…/`, not in this file.

**Version**: 1.0.0 | **Ratified**: 2026-04-19 | **Last Amended**: 2026-04-19
