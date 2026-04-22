import type { Keyboard } from './types';

/**
 * Pure: return the set of Keyboard IDs that are part of any same-device-
 * same-channel conflict.
 *
 * Keyboards with `deviceName === null` OR `channel === null` are never in
 * conflict — they do not identify a uniquely-routable stream.
 */
export function detectConflicts(keyboards: readonly Keyboard[]): Set<string> {
  const buckets = new Map<string, Keyboard[]>();
  for (const kb of keyboards) {
    if (kb.deviceName == null || kb.channel == null) continue;
    const key = `${kb.deviceName}::${kb.channel}`;
    const arr = buckets.get(key) ?? [];
    arr.push(kb);
    buckets.set(key, arr);
  }
  const conflicted = new Set<string>();
  for (const arr of buckets.values()) {
    if (arr.length > 1) {
      for (const kb of arr) conflicted.add(kb.id);
    }
  }
  return conflicted;
}
