import { useContext } from 'react';
import { PreferencesContext, type PreferencesContextValue } from './PreferencesContext';

/**
 * Read the current preferences, the loaded flag, and a setter.
 *
 * Throws if called outside a `<PreferencesProvider>` — preferences are a core
 * runtime dependency of the MIDI subsystem, so we fail loudly rather than
 * silently running with stale defaults.
 */
export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (value === null) {
    throw new Error('usePreferences must be used within a <PreferencesProvider>.');
  }
  return value;
}
