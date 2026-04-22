import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PreferencesMenu } from '../../src/app/PreferencesMenu';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { usePreferences } from '../../src/prefs/usePreferences';

function Probe() {
  const { prefs } = usePreferences();
  return (
    <>
      <Text testID="probed-sysex">{String(prefs.ignoreSysEx)}</Text>
      <Text testID="probed-rt">{String(prefs.ignoreSystemRealTime)}</Text>
    </>
  );
}

function renderMenu(onClose: () => void = () => {}) {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <PreferencesMenu visible onClose={onClose} />
      <Probe />
    </PreferencesProvider>,
  );
}

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe('PreferencesMenu', () => {
  it('renders all required landmarks and rows', async () => {
    renderMenu();
    await flush();
    expect(screen.getByTestId('prefs-overlay')).toBeTruthy();
    expect(screen.getByTestId('prefs-title')).toBeTruthy();
    expect(screen.getByTestId('prefs-row-ignoreSysEx')).toBeTruthy();
    expect(screen.getByTestId('prefs-row-ignoreSystemRealTime')).toBeTruthy();
  });

  it('close control calls onClose when activated', async () => {
    const onClose = jest.fn();
    renderMenu(onClose);
    await flush();
    fireEvent.press(screen.getByRole('button', { name: 'Close Preferences' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('tapping the Ignore SysEx row flips prefs.ignoreSysEx', async () => {
    renderMenu();
    await waitFor(() =>
      expect(screen.getByTestId('probed-sysex').props.children).toBe('true'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('prefs-row-ignoreSysEx'));
    });
    expect(screen.getByTestId('probed-sysex').props.children).toBe('false');
  });

  it('tapping the Ignore System Real-Time row flips prefs.ignoreSystemRealTime', async () => {
    renderMenu();
    await waitFor(() =>
      expect(screen.getByTestId('probed-rt').props.children).toBe('true'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('prefs-row-ignoreSystemRealTime'));
    });
    expect(screen.getByTestId('probed-rt').props.children).toBe('false');
  });

  it('switches have accessibilityState.checked tracking current pref', async () => {
    renderMenu();
    await waitFor(() =>
      expect(screen.getByTestId('probed-sysex').props.children).toBe('true'),
    );
    const sysexSwitch = screen.getByRole('switch', { name: 'Ignore SysEx' });
    expect(sysexSwitch.props.accessibilityState?.checked).toBe(true);
    const rtSwitch = screen.getByRole('switch', { name: 'Ignore System Real-Time' });
    expect(rtSwitch.props.accessibilityState?.checked).toBe(true);
  });

  it('Modal onRequestClose (Android back) also calls onClose', async () => {
    const onClose = jest.fn();
    renderMenu(onClose);
    await flush();
    const overlay = screen.getByTestId('prefs-overlay');
    // PreferencesMenu attaches onRequestClose to the Modal; we invoke it
    // directly to simulate the Android back gesture.
    const handler = overlay.props.onRequestClose;
    expect(typeof handler).toBe('function');
    act(() => {
      handler?.();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
