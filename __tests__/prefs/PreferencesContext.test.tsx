import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { usePreferences } from '../../src/prefs/usePreferences';

function Probe() {
  const { prefs, isLoaded, setPreference } = usePreferences();
  return (
    <View>
      <Text testID="is-loaded">{isLoaded ? 'loaded' : 'loading'}</Text>
      <Text testID="ignoreSysEx">{String(prefs.ignoreSysEx)}</Text>
      <Text testID="ignoreSystemRealTime">{String(prefs.ignoreSystemRealTime)}</Text>
      <Pressable
        testID="toggle-sysex"
        onPress={() => setPreference('ignoreSysEx', !prefs.ignoreSysEx)}
      >
        <Text>toggle sysex</Text>
      </Pressable>
    </View>
  );
}

describe('PreferencesContext', () => {
  it('starts with defaults and isLoaded=false, then loads and flips isLoaded=true', async () => {
    const loader = jest.fn().mockResolvedValue({});
    render(
      <PreferencesProvider loader={loader} saver={jest.fn().mockResolvedValue(undefined)}>
        <Probe />
      </PreferencesProvider>,
    );
    // Initial synchronous render — defaults, not yet loaded.
    expect(screen.getByTestId('is-loaded').props.children).toBe('loading');
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('true');
    expect(screen.getByTestId('ignoreSystemRealTime').props.children).toBe('true');

    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
  });

  it('overlays seeded values on top of defaults once loaded', async () => {
    const loader = jest.fn().mockResolvedValue({ ignoreSysEx: false });
    render(
      <PreferencesProvider loader={loader} saver={jest.fn().mockResolvedValue(undefined)}>
        <Probe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('false');
    // Missing key in seeded value — should fall back to default.
    expect(screen.getByTestId('ignoreSystemRealTime').props.children).toBe('true');
  });

  it('setPreference flips a value synchronously and triggers a save', async () => {
    const saver = jest.fn().mockResolvedValue(undefined);
    render(
      <PreferencesProvider loader={jest.fn().mockResolvedValue({})} saver={saver}>
        <Probe />
      </PreferencesProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('toggle-sysex'));
    });
    expect(screen.getByTestId('ignoreSysEx').props.children).toBe('false');
    expect(saver).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreSysEx: false }),
    );
  });

  it('usePreferences() outside a provider throws a developer-facing error', () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/PreferencesProvider/);
    } finally {
      console.error = originalError;
    }
  });
});
