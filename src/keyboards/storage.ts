// AsyncStorage-backed persistence for the Keyboards setup.
//
// Failure-safe, mirroring src/prefs/storage.ts:
// - Read miss or parse error → return null; callers synthesise the default.
// - Write failure → log + swallow; in-memory state remains effective.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Keyboard, StoredSetup } from './types';

export const STORAGE_KEY = 'cadenza.keyboards.v1';

export async function loadKeyboards(): Promise<readonly Keyboard[] | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSetup>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === 1 &&
      Array.isArray(parsed.keyboards)
    ) {
      return parsed.keyboards as readonly Keyboard[];
    }
    logStorageFailure('load', new Error('unexpected shape'));
    return null;
  } catch (err) {
    logStorageFailure('load', err);
    return null;
  }
}

export async function saveKeyboards(keyboards: readonly Keyboard[]): Promise<void> {
  try {
    const blob: StoredSetup = { version: 1, keyboards };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch (err) {
    logStorageFailure('save', err);
  }
}

function logStorageFailure(op: 'load' | 'save', err: unknown): void {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[keyboards] ${op} failed`, err);
  }
}
