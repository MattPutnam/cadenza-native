import type { Preferences } from '../prefs/schema';
import { isSystemRealTime, type MidiMessage } from './types';

/**
 * Returns true if the message should be delivered to subscribers, false if
 * current preferences filter it out. O(1) — no allocations, no branching
 * beyond the single conditional.
 */
export function shouldDeliver(msg: MidiMessage, prefs: Preferences): boolean {
  if (prefs.ignoreSysEx && msg.type === 'sysex') return false;
  if (prefs.ignoreSystemRealTime && isSystemRealTime(msg)) return false;
  return true;
}
