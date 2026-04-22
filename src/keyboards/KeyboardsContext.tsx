import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { newDefaultKeyboard } from './schema';
import { loadKeyboards, saveKeyboards } from './storage';
import type { Keyboard } from './types';

export interface KeyboardsContextValue {
  readonly keyboards: readonly Keyboard[];
  readonly isLoaded: boolean;
  add: () => void;
  update: (id: string, patch: Partial<Omit<Keyboard, 'id'>>) => void;
  remove: (id: string) => void;
}

export const KeyboardsContext = createContext<KeyboardsContextValue | null>(null);

export interface KeyboardsProviderProps {
  children: ReactNode;
  /** Test seam — override storage. Default uses AsyncStorage. */
  loader?: () => Promise<readonly Keyboard[] | null>;
  saver?: (keyboards: readonly Keyboard[]) => Promise<void>;
}

/**
 * Session + persistence provider for the user's Keyboards setup.
 *
 * On mount, loads the stored list; on read miss or parse error, synthesises
 * the default single-88 state WITHOUT saving (so a legitimate storage entry
 * isn't clobbered by a race). Subsequent CRUD mutations dispatch an async
 * save. Save failures are logged but do not roll back the in-memory state.
 */
export function KeyboardsProvider({
  children,
  loader = loadKeyboards,
  saver = saveKeyboards,
}: KeyboardsProviderProps) {
  const [keyboards, setKeyboards] = useState<readonly Keyboard[]>(() => [newDefaultKeyboard()]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Track whether we have loaded at least once so updates can opt into save.
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loader().then((persisted) => {
      if (cancelled) return;
      if (persisted != null && persisted.length > 0) {
        setKeyboards(persisted);
      }
      // else: keep the synthesised default already in state; do NOT save.
      loadedRef.current = true;
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loader]);

  const persist = useCallback(
    (next: readonly Keyboard[]) => {
      if (!loadedRef.current) return;
      void saver(next);
    },
    [saver],
  );

  const add = useCallback(() => {
    setKeyboards((prev) => {
      const next = [...prev, newDefaultKeyboard()];
      persist(next);
      return next;
    });
  }, [persist]);

  const update = useCallback(
    (id: string, patch: Partial<Omit<Keyboard, 'id'>>) => {
      setKeyboards((prev) => {
        const target = prev.find((k) => k.id === id);
        if (!target) return prev;

        let draft: Keyboard = { ...target, ...patch };

        // Channel auto-default when deviceName changes to a shared value.
        if ('deviceName' in patch && patch.deviceName !== target.deviceName) {
          if (draft.deviceName == null) {
            draft = { ...draft, channel: null };
          } else {
            const siblings = prev.filter(
              (k) => k.id !== id && k.deviceName === draft.deviceName,
            );
            if (siblings.length === 0) {
              draft = { ...draft, channel: null };
            } else if (draft.channel == null) {
              const used = new Set(
                siblings.map((s) => s.channel).filter((c): c is number => c != null),
              );
              let pick: number | null = null;
              for (let c = 1; c <= 16; c++) {
                if (!used.has(c)) {
                  pick = c;
                  break;
                }
              }
              draft = { ...draft, channel: pick };
            }
          }
        }

        const next = prev.map((k) => (k.id === id ? draft : k));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      setKeyboards((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((k) => k.id !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const value = useMemo<KeyboardsContextValue>(
    () => ({ keyboards, isLoaded, add, update, remove }),
    [keyboards, isLoaded, add, update, remove],
  );

  return <KeyboardsContext.Provider value={value}>{children}</KeyboardsContext.Provider>;
}
