import { BUILT_IN_KEYBOARD_SIZES, type Keyboard } from './types';

/** Default range for a new keyboard (88-key piano: A0..C8). */
const DEFAULT_RANGE = BUILT_IN_KEYBOARD_SIZES[BUILT_IN_KEYBOARD_SIZES.length - 1];

/**
 * Generate a new opaque-ish id. Uses `crypto.randomUUID()` when available
 * (modern Hermes / Node / browsers) and falls back to a timestamp + random
 * suffix otherwise so tests always have a stable generator available.
 */
export function newId(): string {
  const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Factory: a brand-new Keyboard with the 88-key default range and all other fields null. */
export function newDefaultKeyboard(): Keyboard {
  return {
    id: newId(),
    lowKey: DEFAULT_RANGE.low,
    highKey: DEFAULT_RANGE.high,
    deviceName: null,
    channel: null,
    nickname: null,
  };
}

/**
 * Derive the user-facing label for a Keyboard. Returns the nickname when
 * non-empty; otherwise "Keyboard N" (1-indexed by position).
 */
export function displayName(keyboard: Keyboard, position: number): string {
  if (keyboard.nickname != null && keyboard.nickname.length > 0) {
    return keyboard.nickname;
  }
  return `Keyboard ${position + 1}`;
}
