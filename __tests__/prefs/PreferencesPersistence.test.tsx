import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { MidiInputProvider, useMidiInput } from '../../src/midi/MidiInputContext';
import type { MidiMessage } from '../../src/midi/types';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { STORAGE_KEY } from '../../src/prefs/storage';
import { usePreferences } from '../../src/prefs/usePreferences';
import { MidiMock } from '../helpers/midiMock';

beforeEach(async () => {
  await AsyncStorage.clear();
  MidiMock.__reset();
});

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function PrefsProbe() {
  const { prefs, isLoaded, setPreference } = usePreferences();
  useEffect(() => {
    // Expose setPreference on the window-ish global so tests can call it.
    (globalThis as unknown as { __setPreference?: typeof setPreference }).__setPreference =
      setPreference;
  }, [setPreference]);
  return (
    <>
      <Text testID="is-loaded">{isLoaded ? 'loaded' : 'loading'}</Text>
      <Text testID="ignoreSysEx">{String(prefs.ignoreSysEx)}</Text>
      <Text testID="ignoreSystemRealTime">{String(prefs.ignoreSystemRealTime)}</Text>
    </>
  );
}

describe('Preferences persistence (US3)', () => {
  it('uses defaults when no persisted value exists', async () => {
    render(
      <PreferencesProvider>
        <PrefsProbe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('true');
    expect(screen.getByTestId('ignoreSystemRealTime').props.children).toBe('true');
  });

  it('loads seeded AsyncStorage values on mount and falls back to defaults for missing keys', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ignoreSysEx: false }));
    render(
      <PreferencesProvider>
        <PrefsProbe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('false');
    // Missing key falls back to its default.
    expect(screen.getByTestId('ignoreSystemRealTime').props.children).toBe('true');
  });

  it('toggling writes to storage; a fresh remount reads the value back', async () => {
    const first = render(
      <PreferencesProvider>
        <PrefsProbe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('true');

    act(() => {
      (
        globalThis as unknown as { __setPreference: (k: 'ignoreSysEx', v: boolean) => void }
      ).__setPreference('ignoreSysEx', false);
    });
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('false');

    // Wait for async save to AsyncStorage to complete.
    await flush();

    first.unmount();

    // Fresh "cold launch" — remount and verify the persisted value is read back.
    render(
      <PreferencesProvider>
        <PrefsProbe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('false');
  });

  it('persisted ignoreSysEx=true is actually applied by the MIDI filter on next launch', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ignoreSysEx: true }));

    let deliveredSysEx = 0;
    function Subscriber() {
      const { subscribe } = useMidiInput();
      useEffect(
        () =>
          subscribe((msg: MidiMessage) => {
            if (msg.type === 'sysex') deliveredSysEx++;
          }),
        [subscribe],
      );
      return null;
    }

    render(
      <PreferencesProvider>
        <MidiInputProvider>
          <Subscriber />
        </MidiInputProvider>
      </PreferencesProvider>,
    );
    await flush();

    act(() => {
      MidiMock.__fireMessage([0xf0, 0x01, 0xf7]);
    });
    expect(deliveredSysEx).toBe(0);

    // A non-SysEx message should still be delivered — proving filter is scoped
    // correctly, not blanket-dropping.
    let deliveredNote = 0;
    function NoteSub() {
      const { subscribe } = useMidiInput();
      useEffect(
        () =>
          subscribe((msg: MidiMessage) => {
            if (msg.type === 'noteOn') deliveredNote++;
          }),
        [subscribe],
      );
      return null;
    }
    render(
      <PreferencesProvider>
        <MidiInputProvider>
          <NoteSub />
        </MidiInputProvider>
      </PreferencesProvider>,
    );
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(deliveredNote).toBeGreaterThanOrEqual(1);
  });
});
