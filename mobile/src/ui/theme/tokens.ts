/**
 * Design tokens, converted once from the web app's OKLCH palette.
 *
 * `client/src/app/globals.css` declares colours as `oklch(L C H)`, which React
 * Native cannot parse, so the values below were converted ahead of time rather
 * than at runtime — deterministic, reviewable in a diff, and no conversion code
 * ships in the bundle. Regenerate with scripts if the web palette moves.
 *
 * `primary`/`accent`/`ring` use the web app's *student-portal* violet override
 * rather than the calm base greys, since this app is entirely student-facing.
 *
 * Colours marked clamped fall outside the sRGB gamut in OKLCH and were clipped
 * on conversion; they are very close to, but not exactly, the web rendering.
 */

export const lightColors = {
  background: '#ffffff',
  foreground: '#0a0a0a',
  card: '#ffffff',
  cardForeground: '#0a0a0a',
  primary: '#6d47b8',
  primaryForeground: '#faf9fd',
  secondary: '#f5f5f5',
  secondaryForeground: '#171717',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  accent: '#ece2ff', // clamped
  accentForeground: '#312451',
  destructive: '#e7000b', // clamped
  destructiveForeground: '#fafafa',
  border: '#e5e5e5',
  input: '#e5e5e5',
  ring: '#8166c3',
  success: '#009056', // clamped
  successForeground: '#f8f8f8',
  warning: '#de9400', // clamped
  warningForeground: '#0b0b0b',
} as const;

export const darkColors = {
  background: '#0a0a0a',
  foreground: '#fafafa',
  card: '#171717',
  cardForeground: '#fafafa',
  primary: '#ab91f2',
  primaryForeground: '#110b1f',
  secondary: '#262626',
  secondaryForeground: '#fafafa',
  muted: '#262626',
  mutedForeground: '#a1a1a1',
  accent: '#352c4e',
  accentForeground: '#efedf5',
  destructive: '#e7000b', // clamped
  destructiveForeground: '#fafafa',
  border: '#262626',
  input: '#262626',
  ring: '#927ccd',
  success: '#00ac76', // clamped
  successForeground: '#0b0b0b',
  warning: '#ecaa0b',
  warningForeground: '#0b0b0b',
} as const;

export type ColorName = keyof typeof lightColors;

/**
 * Values are widened to `string` on purpose. `as const` above is there to fix
 * the *key* set so light and dark cannot drift apart, but leaving the values as
 * literals would make every consumer's type depend on the exact hex — the light
 * and dark palettes would then be mutually unassignable.
 */
export type ColorTokens = Record<ColorName, string>;

/** 4pt grid. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;
