// AsyncStorage-backed persistence for Preferences.
//
// Failure-safe by design (FR-023): every read and write catches its own errors.
// - Read failures → return {} so callers fall back to defaults.
// - Write failures → swallow + log; the in-memory value is still effective.
// - Storage absence / first-launch → treated the same as a read miss.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences } from './schema';

export const STORAGE_KEY = 'cadenza.preferences.v1';

export async function loadPreferences(): Promise<Partial<Preferences>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Partial<Preferences>;
    }
    return {};
  } catch (err) {
    logStorageFailure('load', err);
    return {};
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    logStorageFailure('save', err);
  }
}

function logStorageFailure(op: 'load' | 'save', err: unknown): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[prefs] ${op} failed`, err);
  }
}
