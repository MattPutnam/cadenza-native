import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePreferences } from '../prefs/usePreferences';
import { shouldDeliver } from './filter';
import { parseMidiMessage } from './parser';
import {
  createNoopAdapter,
  loadNativeAdapter,
  type MidiPlatformAdapter,
} from './platform';
import type { MidiDevice, MidiMessage } from './types';

type MessageListener = (msg: MidiMessage) => void;

export interface MidiInputContextValue {
  subscribe: (listener: MessageListener) => () => void;
  devices: readonly MidiDevice[];
}

export const MidiInputContext = createContext<MidiInputContextValue | null>(null);

export interface MidiInputProviderProps {
  children: ReactNode;
  /**
   * Test seam — inject an adapter (typically `createNoopAdapter()` in tests
   * that should NOT connect to the mock MIDI module). Production code omits
   * this and the native adapter is loaded automatically.
   */
  adapter?: MidiPlatformAdapter;
}

export function MidiInputProvider({ children, adapter }: MidiInputProviderProps) {
  const { prefs, isLoaded } = usePreferences();

  // The current prefs snapshot, read live on every receive path invocation so
  // filter decisions track toggles without recreating the subscription.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  // Listeners registered via subscribe(). Stored in a ref so toggling listeners
  // never triggers a re-render of the provider tree.
  const listenersRef = useRef<Set<MessageListener>>(new Set());

  // Resolve the adapter once; injecting a new prop at runtime is not supported
  // (tests that want to change adapters unmount and remount).
  const resolvedAdapter = useMemo<MidiPlatformAdapter>(
    () => adapter ?? loadNativeAdapter(),
    [adapter],
  );

  const [devices, setDevices] = useState<readonly MidiDevice[]>(() => {
    try {
      return resolvedAdapter.getDevices();
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Gate subscription on prefs being loaded so we don't race filter decisions
    // against the first message.
    if (!isLoaded) return;

    const unsubscribeMessages = resolvedAdapter.subscribeToMessages((event) => {
      const msg = parseMidiMessage(
        Uint8Array.from(event.bytes),
        event.deviceId,
        event.timestamp,
      );
      if (!shouldDeliver(msg, prefsRef.current)) return;
      // Snapshot the listener set so a listener that removes itself (or another
      // listener) mid-dispatch cannot corrupt iteration.
      const snapshot = Array.from(listenersRef.current);
      for (const listener of snapshot) {
        try {
          listener(msg);
        } catch {
          // Listener failures are isolated per Principle I: one broken
          // component must not take down the MIDI path.
        }
      }
    });

    const unsubscribeDevices = resolvedAdapter.observeDevices((event) => {
      setDevices((previous) => {
        if (event.type === 'added') {
          if (previous.some((d) => d.id === event.device.id)) return previous;
          return [...previous, event.device];
        }
        return previous.filter((d) => d.id !== event.device.id);
      });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeDevices();
    };
  }, [resolvedAdapter, isLoaded]);

  const subscribe = useCallback((listener: MessageListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<MidiInputContextValue>(
    () => ({ subscribe, devices }),
    [subscribe, devices],
  );

  return <MidiInputContext.Provider value={value}>{children}</MidiInputContext.Provider>;
}

/**
 * Consumer hook. Throws if used outside a `<MidiInputProvider>`.
 */
export function useMidiInput(): MidiInputContextValue {
  const value = useContext(MidiInputContext);
  if (value === null) {
    throw new Error('useMidiInput must be used within a <MidiInputProvider>.');
  }
  return value;
}

// Re-exported for convenience so tests can inject the no-op adapter without a
// separate import line.
export { createNoopAdapter };
