import { useContext } from 'react';
import { EditViewContext, type EditViewContextValue } from './EditViewContext';

/**
 * Read the current Edit sub-view selection and its setter.
 *
 * Throws if called outside an `<EditViewProvider>`. The provider must be
 * mounted above the Edit/Perform conditional in `Shell.tsx` so the selection
 * survives across mode switches.
 */
export function useEditView(): EditViewContextValue {
  const value = useContext(EditViewContext);
  if (value === null) {
    throw new Error('useEditView must be used within an <EditViewProvider>.');
  }
  return value;
}
