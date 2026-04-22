import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';

export type EditView = 'setup' | 'patches' | 'cues';

export const EDIT_VIEWS: readonly EditView[] = ['setup', 'patches', 'cues'] as const;

export const EDIT_VIEW_LABELS: Record<EditView, string> = {
  setup: 'Setup',
  patches: 'Patches',
  cues: 'Cues',
};

export interface EditViewContextValue {
  editView: EditView;
  setEditView: (next: EditView) => void;
}

/**
 * Sentinel for "no provider". Consumers outside a provider will see `null` and
 * `useEditView()` will throw — mirrors the `ModeContext` convention.
 */
export const EditViewContext = createContext<EditViewContextValue | null>(null);

export interface EditViewProviderProps {
  children: ReactNode;
}

/**
 * Session-scoped provider for the current Edit sub-view selection.
 *
 * Initial value is always `'setup'` (FR-008). MUST NOT persist to AsyncStorage
 * or any other durable storage; cold launch resets to `'setup'`. Mount this
 * provider ABOVE the Edit/Perform conditional in `Shell.tsx` so the selection
 * survives `EditMode` unmounting on mode switches (FR-009, FR-012).
 */
export function EditViewProvider({ children }: EditViewProviderProps) {
  const [editView, setEditViewState] = useState<EditView>('setup');

  const setEditView = useCallback((next: EditView) => {
    setEditViewState(next);
  }, []);

  const value = useMemo<EditViewContextValue>(
    () => ({ editView, setEditView }),
    [editView, setEditView],
  );

  return <EditViewContext.Provider value={value}>{children}</EditViewContext.Provider>;
}
