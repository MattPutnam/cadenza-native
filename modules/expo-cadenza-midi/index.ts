import { requireNativeModule, NativeModule } from 'expo-modules-core';

/**
 * JS facade over the CadenzaMidi native module.
 *
 * This module is imported only for its side-effects (creating the native
 * subscription) and its public API is exposed via `platform.ts` in `src/midi/`,
 * where a typed `MidiPlatformAdapter` is constructed around these raw events.
 *
 * Event shapes:
 *   onMessage    : { deviceId: string; bytes: number[]; timestamp: number }
 *   onDeviceChange: { type: 'added' | 'removed'; device: { id: string; name: string; transport: string } }
 */

export type RawMidiEventMap = {
  onMessage: (payload: { deviceId: string; bytes: number[]; timestamp: number }) => void;
  onDeviceChange: (payload: {
    type: 'added' | 'removed';
    device: { id: string; name: string; transport: string };
  }) => void;
};

declare class CadenzaMidiNativeModule extends NativeModule<RawMidiEventMap> {
  getDevices(): { id: string; name: string; transport: string }[];
}

const native = requireNativeModule<CadenzaMidiNativeModule>('CadenzaMidi');

export function getDevices(): { id: string; name: string; transport: string }[] {
  return native.getDevices();
}

export function subscribeToMessages(
  listener: RawMidiEventMap['onMessage'],
): () => void {
  const sub = native.addListener('onMessage', listener);
  return () => sub.remove();
}

export function observeDevices(
  listener: RawMidiEventMap['onDeviceChange'],
): () => void {
  const sub = native.addListener('onDeviceChange', listener);
  return () => sub.remove();
}
