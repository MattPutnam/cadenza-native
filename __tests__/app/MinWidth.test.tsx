import { render, screen } from '@testing-library/react-native';
import { EditMode } from '../../src/app/EditMode';
import { EditViewProvider } from '../../src/edit-view/EditViewContext';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';

const mockUseWindowDimensions = jest.fn(() => ({
  width: 320,
  height: 568,
  scale: 2,
  fontScale: 1,
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

function renderEditMode() {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <ModeProvider>
          <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
            <EditViewProvider>
              <EditMode />
            </EditViewProvider>
          </KeyboardsProvider>
        </ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('SC-005: minimum supported phone width (320 pt, iPhone SE portrait)', () => {
  it('all three header children render and are reachable', () => {
    renderEditMode();

    // View dropdown anchor present.
    const anchor = screen.getByTestId('edit-view-dropdown-button');
    expect(anchor).toBeTruthy();

    // MidiActivityDisplay landmark present.
    expect(screen.getByTestId('midi-activity')).toBeTruthy();

    // Preferences gear present.
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeTruthy();

    // Standalone Perform button is NOT present (covered by dropdown).
    expect(screen.queryByRole('button', { name: 'Perform' })).toBeNull();

    // Edit-mode body renders the Setup view (real implementation from feature 005).
    expect(screen.getByTestId('setup-view')).toBeTruthy();
  });
});
