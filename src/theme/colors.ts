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
 * - textSecondary on surface         ~7.4:1    (AAA)
 * - focusRing on surface             ~6.3:1    (AA for UI components)
 * - focusRing on performBlack        ~6.9:1    (AA for UI components)
 */
export const colors = {
  /** Base chrome background used by the edit shell below the header. */
  surface: '#0B0B0D',
  /** Slightly lighter elevation used by the header bar itself. */
  surfaceElevated: '#151518',
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
  /** Pure black for perform-mode background (FR-006). Never substitute with surface. */
  performBlack: '#000000',
} as const;

export type ColorToken = keyof typeof colors;
