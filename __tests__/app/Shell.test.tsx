import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, View } from 'react-native';
import { Shell } from '../../src/app/Shell';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';

const mockUseWindowDimensions = jest.fn(() => ({
  width: 800,
  height: 1024,
  scale: 2,
  fontScale: 1,
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

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
        <ModeProvider>
          <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
            {ui}
          </KeyboardsProvider>
        </ModeProvider>
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

  it('preserves the Edit sub-view across Edit → Perform → Edit (FR-009, US3)', () => {
    // Tablet width so we can tap the Patches segment directly.
    mockUseWindowDimensions.mockReturnValue({
      width: 800,
      height: 1024,
      scale: 2,
      fontScale: 1,
    });
    renderWithAllProviders(
      <>
        <Shell />
        <EnterPerform />
        <ExitPerform />
      </>,
    );

    // Initially in Edit mode, default sub-view is Setup.
    expect(screen.getByTestId('setup-view')).toBeTruthy();

    // Move to Patches via the real segmented-control UI.
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-segment-patches'));
    });
    expect(screen.getByTestId('view-patches')).toBeTruthy();

    // Round-trip: Edit → Perform → Edit.
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    expect(screen.queryByTestId('edit-header')).toBeNull();
    act(() => {
      fireEvent.press(screen.getByTestId('harness-exit-perform'));
    });

    // Patches sub-view is preserved — not reset to Setup.
    expect(screen.getByTestId('view-patches')).toBeTruthy();
    expect(screen.queryByTestId('setup-view')).toBeNull();
  });
});
