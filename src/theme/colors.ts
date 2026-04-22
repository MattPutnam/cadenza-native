/**
 * Dark-theme color tokens for Cadenza.
 *
 * Per constitution Principle VI, the app ships dark mode only. Every surface
 * renders against these tokens — no raw hex values in components.
 *
 * Contrast notes (WCAG AA targets a 4.5:1 ratio for normal text, 3:1 for UI
 * components):
 *
 * - textPrimary on surface           ~14.6:1   (AAA)
 * - textPrimary on surfaceElevated   ~12.1:1   (AAA)
 * - textPrimary on modalSurface      ~14.6:1   (AAA; modalSurface === surface tone)
 * - textSecondary on surface         ~7.4:1    (AAA)
 * - focusRing on surface             ~6.3:1    (AA for UI components)
 * - focusRing on performBlack        ~6.9:1    (AA for UI components)
 * - switchThumbOn on switchTrackOn   ~4.8:1    (AA for UI components)
 */
export const colors = {
  /** Base chrome background used by the edit shell below the header. */
  surface: '#0B0B0D',
  /** Slightly lighter elevation used by the header bar itself. */
  surfaceElevated: '#151518',
  /** Full-bleed surface for the preferences modal overlay (opaque, not a scrim). */
  modalSurface: '#0B0B0D',
  /** Hairline separator between the header and the body. */
  border: '#2A2A2F',
  /** Primary text and icon color (button labels, headings). */
  textPrimary: '#F5F5F7',
  /** Secondary text — placeholder copy, muted labels. */
  textSecondary: '#B5B5BA',
  /** Keyboard focus ring. Chosen to remain visible against both surface and performBlack. */
  focusRing: '#7FB3FF',
  /** Primary action button fill. onAccent on accent is ~4.6:1 (AA for normal text). */
  accent: '#2563EB',
  /** Pressed-state fill for primary action buttons. */
  accentPressed: '#1D4ED8',
  /** Text/icon color placed on top of accent fills. */
  onAccent: '#FFFFFF',
  /** Switch track when the preference is ON (uses the same accent as primary buttons). */
  switchTrackOn: '#2563EB',
  /** Switch track when the preference is OFF (subdued neutral). */
  switchTrackOff: '#3A3A3F',
  /** Switch thumb when ON. */
  switchThumbOn: '#FFFFFF',
  /** Switch thumb when OFF. */
  switchThumbOff: '#D4D4D8',
  /** Pure black for perform-mode background (FR-006). Never substitute with surface. */
  performBlack: '#000000',

  // --- feature 004: Keyboard display component ---
  //
  // Contrast notes (WCAG: 4.5:1 for normal text; 3:1 for UI components and
  // graphical objects):
  //   keyboardWhiteKey on surface      ≈ 16.0:1  (AAA)
  //   keyboardBlackKey on white key    ≈ 13.8:1  (AAA — the relevant adjacency)
  //   keyboardHighlight on white key   ≈  4.1:1  (just under AA 4.5; passes AA 3:1 for UI/graphic)
  //   keyboardHighlight on black key   ≈  3.3:1  (below AA 4.5; passes AA 3:1 for UI/graphic)
  //
  // A single blue cannot hit 4.5:1 against BOTH a very-light and a very-dark
  // neutral — the mathematical midpoint is near 3.5:1. The current values
  // prioritize palette coherence (`keyboardHighlight` === `accent`) and
  // satisfy the 3:1 graphical-object standard, which is the applicable
  // criterion for a state-changed UI element like a highlighted key.

  /** Fill color for white keys. */
  keyboardWhiteKey: '#E8E8EA',
  /** Fill color for black keys. */
  keyboardBlackKey: '#1A1A1F',
  /** Fill color for highlighted keys. Reuses `accent` for palette coherence. */
  keyboardHighlight: '#2563EB',

  // --- feature 003: Edit view switcher (segmented control + dropdown menu) ---

  /** Segmented control container/group background (unselected-segment grouping). */
  segmentedTrack: '#1F1F24',
  /** Filled background of the currently-selected segment. */
  segmentedSelected: '#2563EB',
  /** Label color for unselected segments. textPrimary on segmentedTrack ≈ 12.0:1 (AAA). */
  segmentedLabel: '#F5F5F7',
  /** Label color for the selected segment. Contrast vs segmentedSelected ≈ 4.8:1 (AA). */
  segmentedLabelSelected: '#FFFFFF',
  /** Dropdown menu surface. Slightly brighter than surfaceElevated for pop. */
  menuSurface: '#1C1C20',
  /** Hairline divider between menu items. */
  menuDivider: '#2A2A2F',
  /** Pressed-state overlay for menu items (dark-mode press feedback). */
  menuItemPressed: '#26262B',
} as const;

export type ColorToken = keyof typeof colors;
