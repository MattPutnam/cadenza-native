// Typed shim for the Jest-mocked MIDI module.
//
// The real module at `modules/expo-cadenza-midi` is mapped (via Jest's
// moduleNameMapper in package.json) to `__mocks__/modules/expo-cadenza-midi.js`,
// which exports extra test-only helpers (__fireMessage, __fireDeviceChange,
// __reset, __setDevices). TypeScript only sees the real module's types, so we
// widen to the mock's surface here and re-export.

import * as MidiModule from '../../modules/expo-cadenza-midi';
import type { MidiDevice } from '../../src/midi/types';

export interface MidiMockHelpers {
  __fireMessage(bytes: number[], deviceId?: string, timestamp?: number): void;
  __fireDeviceChange(event: { type: 'added' | 'removed'; device: MidiDevice }): void;
  __setDevices(list: MidiDevice[]): void;
  __reset(): void;
  getDevices(): MidiDevice[];
  subscribeToMessages(cb: (e: unknown) => void): () => void;
  observeDevices(cb: (e: unknown) => void): () => void;
}

export const MidiMock = MidiModule as unknown as MidiMockHelpers;
