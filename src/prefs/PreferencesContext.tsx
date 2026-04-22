import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_PREFERENCES, type PreferenceKey, type Preferences } from './schema';
import { loadPreferences, savePreferences } from './storage';

export interface PreferencesContextValue {
  prefs: Preferences;
  isLoaded: boolean;
  setPreference: <K extends PreferenceKey>(key: K, value: Preferences[K]) => void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export interface PreferencesProviderProps {
  children: ReactNode;
  /**
   * Test seam — provide an alternative async loader. Production code should
   * omit this to use the AsyncStorage-backed default.
   */
  loader?: () => Promise<Partial<Preferences>>;
  /**
   * Test seam — provide an alternative async saver.
   */
  saver?: (prefs: Preferences) => Promise<void>;
}

/**
 * Root provider for the app's user-configurable preferences.
 *
 * On mount, loads persisted values and merges over defaults, then flips
 * `isLoaded` to true. `setPreference` updates state synchronously and persists
 * asynchronously (fire-and-forget).
 */
export function PreferencesProvider({
  children,
  loader = loadPreferences,
  saver = savePreferences,
}: PreferencesProviderProps) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    let cancelled = false;
    loader().then((persisted) => {
      if (cancelled) return;
      setPrefs({ ...DEFAULT_PREFERENCES, ...persisted });
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  const setPreference = useCallback(
    <K extends PreferenceKey>(key: K, value: Preferences[K]) => {
      setPrefs((current) => {
        const next = { ...current, [key]: value };
        // Save fire-and-forget; storage layer is failure-safe.
        saver(next);
        return next;
      });
    },
    [saver],
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({ prefs, isLoaded, setPreference }),
    [prefs, isLoaded, setPreference],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
