import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, View } from 'react-native';
import { Shell } from '../../src/app/Shell';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';

function EnterPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="harness-enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

function ExitPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="harness-exit-perform" onPress={() => setMode('edit')}>
      <View />
    </Pressable>
  );
}

function renderWithAllProviders(ui: React.ReactElement) {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <ModeProvider>{ui}</ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('Shell', () => {
  it('renders EditMode when mode is "edit"', () => {
    renderWithAllProviders(<Shell />);
    expect(screen.queryByTestId('edit-header')).toBeTruthy();
    expect(screen.queryByTestId('perform-surface')).toBeNull();
  });

  it('renders PerformMode when mode is "perform"', () => {
    renderWithAllProviders(
      <>
        <Shell />
        <EnterPerform />
      </>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    expect(screen.queryByTestId('edit-header')).toBeNull();
    expect(screen.queryByTestId('perform-surface')).toBeTruthy();
  });

  it('rounds-trip back to EditMode when leaving Perform mode', () => {
    renderWithAllProviders(
      <>
        <Shell />
        <EnterPerform />
        <ExitPerform />
      </>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('harness-exit-perform'));
    });
    expect(screen.queryByTestId('edit-header')).toBeTruthy();
    expect(screen.queryByTestId('perform-surface')).toBeNull();
  });
});
