import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EditMode } from '../../src/app/EditMode';
import { EditViewProvider } from '../../src/edit-view/EditViewContext';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { colors } from '../../src/theme/colors';

const mockUseWindowDimensions = jest.fn(() => ({
  width: 400,
  height: 800,
  scale: 2,
  fontScale: 1,
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({
    width,
    height: 800,
    scale: 2,
    fontScale: 1,
  });
}

function ModeProbe() {
  const { mode } = useMode();
  return <Text testID="probed-mode">{mode}</Text>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PreferencesProvider
      loader={() => Promise.resolve({})}
      saver={() => Promise.resolve()}
    >
      <MidiInputProvider>
        <ModeProvider>
          <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
            <EditViewProvider>{ui}</EditViewProvider>
          </KeyboardsProvider>
        </ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('EditMode', () => {
  beforeEach(() => {
    setWidth(400); // phone default for existing tests
  });

  it('renders a header landmark at the top containing the "Perform" button on tablet', () => {
    setWidth(800);
    renderWithProviders(<EditMode />);
    const header = screen.getByTestId('edit-header');
    expect(header).toBeTruthy();
    const perform = screen.getByRole('button', { name: 'Perform' });
    expect(perform).toBeTruthy();
  });

  it('activating the "Perform" button flips app mode to "perform" (tablet)', () => {
    setWidth(800);
    renderWithProviders(
      <>
        <EditMode />
        <ModeProbe />
      </>,
    );
    expect(screen.getByTestId('probed-mode').props.children).toBe('edit');
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Perform' }));
    });
    expect(screen.getByTestId('probed-mode').props.children).toBe('perform');
  });

  it('header background is the elevated surface token from the dark theme', () => {
    renderWithProviders(<EditMode />);
    const header = screen.getByTestId('edit-header');
    const flattened = Array.isArray(header.props.style)
      ? Object.assign({}, ...header.props.style)
      : header.props.style;
    expect(flattened.backgroundColor).toBe(colors.surfaceElevated);
  });

  it('renders the MIDI activity landmark in the header', () => {
    renderWithProviders(<EditMode />);
    expect(screen.getByTestId('midi-activity')).toBeTruthy();
  });

  it('renders a Preferences gear button on the right side of the header', () => {
    renderWithProviders(<EditMode />);
    const prefs = screen.getByRole('button', { name: 'Preferences' });
    expect(prefs).toBeTruthy();
  });

  it('tapping the Preferences gear opens the preferences overlay', () => {
    renderWithProviders(<EditMode />);
    expect(screen.queryByTestId('prefs-overlay')).toBeNull();
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Preferences' }));
    });
    expect(screen.queryByTestId('prefs-overlay')).toBeTruthy();
  });

  it('renders the Setup view by default in the body', () => {
    renderWithProviders(<EditMode />);
    expect(screen.getByTestId('setup-view')).toBeTruthy();
    expect(screen.queryByTestId('view-patches')).toBeNull();
    expect(screen.queryByTestId('view-cues')).toBeNull();
  });

  it('on tablet (width >= 600), the segmented view switcher is rendered alongside the Perform button', () => {
    setWidth(800);
    renderWithProviders(<EditMode />);
    expect(screen.getByTestId('edit-view-segmented')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Perform' })).toBeTruthy();
    expect(screen.getByTestId('midi-activity')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeTruthy();
  });

  it('on phone (width < 600), the segmented view switcher is NOT rendered', () => {
    setWidth(400);
    renderWithProviders(<EditMode />);
    expect(screen.queryByTestId('edit-view-segmented')).toBeNull();
  });

  it('on phone (width < 600), the View dropdown replaces the standalone Perform button', () => {
    setWidth(400);
    renderWithProviders(<EditMode />);
    // The View dropdown anchor IS present.
    expect(screen.getByTestId('edit-view-dropdown-button')).toBeTruthy();
    // The standalone Perform button is NOT present on phone.
    expect(screen.queryByRole('button', { name: 'Perform' })).toBeNull();
    // Preferences gear and MIDI activity readout must remain (FR-010).
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeTruthy();
    expect(screen.getByTestId('midi-activity')).toBeTruthy();
    // Body still shows Setup view by default.
    expect(screen.getByTestId('setup-view')).toBeTruthy();
  });

  it('dismissing the overlay via the close control closes it', () => {
    renderWithProviders(<EditMode />);
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Preferences' }));
    });
    expect(screen.queryByTestId('prefs-overlay')).toBeTruthy();
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Close Preferences' }));
    });
    expect(screen.queryByTestId('prefs-overlay')).toBeNull();
  });
});
