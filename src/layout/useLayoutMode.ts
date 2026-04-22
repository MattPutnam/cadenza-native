import { useWindowDimensions } from 'react-native';
import { TABLET_MIN_WIDTH } from './breakpoints';

export type LayoutMode = 'phone' | 'tablet';

/**
 * Classify the current window width as `'phone'` or `'tablet'`. Re-evaluates
 * on rotation, iPad split-view resize, foldable unfold, and Android
 * multi-window changes because `useWindowDimensions` is itself a state
 * subscription.
 *
 * The boundary is inclusive on the tablet side: width === TABLET_MIN_WIDTH
 * classifies as `'tablet'`.
 */
export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH ? 'tablet' : 'phone';
}
