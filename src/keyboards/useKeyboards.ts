import { useContext } from 'react';
import { KeyboardsContext, type KeyboardsContextValue } from './KeyboardsContext';

/**
 * Read the user's Keyboards setup and CRUD operations.
 *
 * Throws if called outside a `<KeyboardsProvider>`.
 */
export function useKeyboards(): KeyboardsContextValue {
  const value = useContext(KeyboardsContext);
  if (value === null) {
    throw new Error('useKeyboards must be used within a <KeyboardsProvider>.');
  }
  return value;
}
