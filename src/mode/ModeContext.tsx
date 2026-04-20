import { createContext, useMemo, useState, type ReactNode } from 'react';

export type Mode = 'edit' | 'perform';

export interface ModeContextValue {
  mode: Mode;
  setMode: (next: Mode) => void;
}

/**
 * Sentinel for "no provider". Components consuming this context outside a
 * ModeProvider will see `null` and `useMode()` will throw a developer-facing
 * error. This prevents silently rendering a surface with no way to exit it.
 */
export const ModeContext = createContext<ModeContextValue | null>(null);

export interface ModeProviderProps {
  children: ReactNode;
}

/**
 * Root provider for the app's Mode state.
 *
 * Per FR-002, the initial value is always `'edit'` — this provider MUST NOT
 * persist `mode` to AsyncStorage, SecureStore, MMKV, or any other durable
 * storage. Session-only state is sufficient because React does not unmount the
 * component tree on background/foreground transitions (FR-010).
 */
export function ModeProvider({ children }: ModeProviderProps) {
  const [mode, setMode] = useState<Mode>('edit');
  const value = useMemo<ModeContextValue>(() => ({ mode, setMode }), [mode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
