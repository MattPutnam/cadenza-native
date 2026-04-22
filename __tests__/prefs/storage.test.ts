import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPreferences, savePreferences, STORAGE_KEY } from '../../src/prefs/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('preferences storage', () => {
  it('returns {} when the key is absent', async () => {
    const result = await loadPreferences();
    expect(result).toEqual({});
  });

  it('returns the parsed object when the key is present', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ignoreSysEx: true }));
    const result = await loadPreferences();
    expect(result).toEqual({ ignoreSysEx: true });
  });

  it('returns {} when the stored value is malformed JSON', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{ not valid json');
    const result = await loadPreferences();
    expect(result).toEqual({});
  });

  it('returns {} when the stored value is a non-object (e.g., a bare string)', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify('not-an-object'));
    const result = await loadPreferences();
    expect(result).toEqual({});
  });

  it('writes the preferences blob under the canonical key', async () => {
    await savePreferences({ ignoreSysEx: true, ignoreSystemRealTime: false });
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ ignoreSysEx: true, ignoreSystemRealTime: false });
  });

  it('swallows AsyncStorage errors on save', async () => {
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('boom'));
    await expect(
      savePreferences({ ignoreSysEx: false, ignoreSystemRealTime: true }),
    ).resolves.toBeUndefined();
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('swallows AsyncStorage errors on load', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
    const result = await loadPreferences();
    expect(result).toEqual({});
  });
});
