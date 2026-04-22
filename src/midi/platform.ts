// Typed adapter over the native MIDI module.
//
// The production adapter reads from `modules/expo-cadenza-midi`. A no-op
// fallback is used when the native module isn't available (web builds,
// unit tests that don't need MIDI input, or on-device when the module
// fails to load).

import type { MidiDevice } from './types';

export interface RawMidiMessageEvent {
  deviceId: string;
  bytes: number[];
  timestamp: number;
}

export type RawDeviceChangeEvent =
  | { type: 'added'; device: MidiDevice }
  | { type: 'removed'; device: MidiDevice };

export interface MidiPlatformAdapter {
  getDevices(): MidiDevice[];
  subscribeToMessages(listener: (event: RawMidiMessageEvent) => void): () => void;
  observeDevices(listener: (event: RawDeviceChangeEvent) => void): () => void;
}

const NOOP_UNSUBSCRIBE = () => {};

export function createNoopAdapter(): MidiPlatformAdapter {
  return {
    getDevices: () => [],
    subscribeToMessages: () => NOOP_UNSUBSCRIBE,
    observeDevices: () => NOOP_UNSUBSCRIBE,
  };
}

/**
 * Load the native adapter, falling back to the no-op if the module isn't
 * resolvable (e.g., running in a context without the Dev Client build).
 * Returns a best-effort adapter so callers never crash on import.
 */
export function loadNativeAdapter(): MidiPlatformAdapter {
  try {
    // Keeping this require() dynamic prevents bundlers from failing on the
    // platform-specific native side when the module is absent.
    const native = require('../../modules/expo-cadenza-midi');
    return {
      getDevices: () => (native.getDevices?.() ?? []) as MidiDevice[],
      subscribeToMessages: (l) => native.subscribeToMessages(l),
      observeDevices: (l) => native.observeDevices(l),
    };
  } catch {
    return createNoopAdapter();
  }
}
