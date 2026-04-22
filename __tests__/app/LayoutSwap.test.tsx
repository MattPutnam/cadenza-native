import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Shell } from '../../src/app/Shell';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';

const mockUseWindowDimensions = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({
    width,
    height: 1024,
    scale: 2,
    fontScale: 1,
  });
}

function renderShell() {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <ModeProvider>
          <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
            <Shell />
          </KeyboardsProvider>
        </ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('FR-012: mid-session layout-mode change', () => {
  it('preserves the sub-view and swaps the header variant across tablet ↔ phone width changes', () => {
    // Start at tablet width.
    setWidth(800);
    const { rerender } = renderShell();
    expect(screen.getByTestId('edit-view-segmented')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Perform' })).toBeTruthy();

    // Select Patches.
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-segment-patches'));
    });
    expect(screen.getByTestId('view-patches')).toBeTruthy();

    // Shrink to phone width (e.g., iPad split 1/3).
    setWidth(400);
    rerender(
      <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
        <MidiInputProvider>
          <ModeProvider>
            <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
              <Shell />
            </KeyboardsProvider>
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>,
    );

    // Header swapped to phone variant; sub-view preserved.
    expect(screen.queryByTestId('edit-view-segmented')).toBeNull();
    expect(screen.getByTestId('edit-view-dropdown-button')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Perform' })).toBeNull();
    expect(screen.getByTestId('view-patches')).toBeTruthy();

    // Grow back to tablet width.
    setWidth(900);
    rerender(
      <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
        <MidiInputProvider>
          <ModeProvider>
            <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
              <Shell />
            </KeyboardsProvider>
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>,
    );

    // Header swapped back to tablet variant; Patches still selected.
    expect(screen.getByTestId('edit-view-segmented')).toBeTruthy();
    expect(screen.queryByTestId('edit-view-dropdown-button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Perform' })).toBeTruthy();
    expect(screen.getByTestId('view-patches')).toBeTruthy();
    expect(
      screen.getByTestId('edit-view-segment-patches').props.accessibilityState.selected,
    ).toBe(true);
  });
});
