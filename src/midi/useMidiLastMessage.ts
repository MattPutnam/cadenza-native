import { useEffect, useRef, useState } from 'react';
import { useMidiInput } from './MidiInputContext';
import type { MidiMessage } from './types';

/**
 * Subscribe to incoming MIDI messages and return the latest one, coalesced to
 * at most one re-render per animation frame.
 *
 * - High-rate streams (dense CC sweeps, clock, aftertouch) land in a ref
 *   without triggering renders.
 * - On the next animation frame, the most recent message is promoted to state
 *   exactly once.
 * - If no new message arrived during a frame, no `setState` is called.
 */
export function useMidiLastMessage(): MidiMessage | null {
  const { subscribe } = useMidiInput();
  const pendingRef = useRef<MidiMessage | null>(null);
  const rafRef = useRef<number | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      pendingRef.current = msg;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current !== null) {
          setLastMessage(pendingRef.current);
        }
      });
    });
    return () => {
      unsubscribe();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingRef.current = null;
    };
  }, [subscribe]);

  return lastMessage;
}
