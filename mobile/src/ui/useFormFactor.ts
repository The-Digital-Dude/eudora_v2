import { Platform, useWindowDimensions } from 'react-native';

export type FormFactor = 'phone' | 'tablet' | 'tv';

/**
 * Resolved once here so screens can branch on intent rather than re-deriving
 * breakpoints. Layout differences belong at the screen level — primitives take
 * `variant`/`size` props and stay form-factor agnostic.
 *
 * Shortest side is the right measure for tablet: it does not flip when the
 * device rotates, unlike width.
 */
export function useFormFactor(): FormFactor {
  const { width, height } = useWindowDimensions();

  if (Platform.isTV) return 'tv';

  const shortestSide = Math.min(width, height);
  return shortestSide >= 600 ? 'tablet' : 'phone';
}
