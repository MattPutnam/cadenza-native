import { useContext } from 'react';
import { ModeContext, type ModeContextValue } from './ModeContext';

/**
 * Read the current Mode and its setter.
 *
 * Throws if called outside a `<ModeProvider>`. Rendering the shell without a
 * provider would leave the user with no way to exit whichever surface ends up
 * mounted, so we fail loudly instead of producing undefined behavior.
 */
export function useMode(): ModeContextValue {
  const value = useContext(ModeContext);
  if (value === null) {
    throw new Error('useMode must be used within a <ModeProvider>.');
  }
  return value;
}
