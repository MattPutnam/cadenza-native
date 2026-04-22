import AsyncStorage from '@react-native-async-storage/async-storage';
import { newDefaultKeyboard } from '../../src/keyboards/schema';
import {
  STORAGE_KEY,
  loadKeyboards,
  saveKeyboards,
} from '../../src/keyboards/storage';
import type { Keyboard } from '../../src/keyboards/types';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('keyboards storage', () => {
  it('loadKeyboards returns null on read miss', async () => {
    expect(await loadKeyboards()).toBeNull();
  });

  it('loadKeyboards returns the list after a save', async () => {
    const kb = { ...newDefaultKeyboard(), nickname: 'Upper' };
    await saveKeyboards([kb]);
    const loaded = await loadKeyboards();
    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBe(1);
    expect(loaded![0].nickname).toBe('Upper');
    expect(loaded![0].lowKey).toBe(21);
    expect(loaded![0].highKey).toBe(108);
  });

  it('loadKeyboards returns null on malformed JSON', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem(STORAGE_KEY, '{not json');
    expect(await loadKeyboards()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('loadKeyboards returns null when the stored version is unexpected', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, keyboards: [] }));
    expect(await loadKeyboards()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('saveKeyboards swallows write errors', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const setItemSpy = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(saveKeyboards([newDefaultKeyboard()])).resolves.toBeUndefined();
    expect(setItemSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('persisted JSON identifies devices by name only, without any device-id field (FR-013)', async () => {
    const kb: Keyboard = {
      ...newDefaultKeyboard(),
      deviceName: 'Roland A-49',
      channel: 1,
      nickname: 'Upper',
    };
    await saveKeyboards([kb]);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    const persistedKb = parsed.keyboards[0];
    expect(persistedKb.deviceName).toBe('Roland A-49');
    // No identifier / vendor fields may leak into storage.
    expect(persistedKb.deviceId).toBeUndefined();
    expect(persistedKb.vendorId).toBeUndefined();
    expect(persistedKb.manufacturer).toBeUndefined();
    expect(persistedKb.uuid).toBeUndefined();
  });
});
