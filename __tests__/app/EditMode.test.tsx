import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EditMode } from '../../src/app/EditMode';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { colors } from '../../src/theme/colors';

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
        <ModeProvider>{ui}</ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('EditMode', () => {
  it('renders a header landmark at the top containing the "Perform" button', () => {
    renderWithProviders(<EditMode />);
    const header = screen.getByTestId('edit-header');
    expect(header).toBeTruthy();
    const perform = screen.getByRole('button', { name: 'Perform' });
    expect(perform).toBeTruthy();
  });

  it('activating the "Perform" button flips app mode to "perform"', () => {
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
