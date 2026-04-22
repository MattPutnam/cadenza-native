import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SetupView } from '../../src/app/SetupView';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import type { Keyboard } from '../../src/keyboards/types';
import { MidiInputProvider, createNoopAdapter } from '../../src/midi/MidiInputContext';
import type { MidiDevice } from '../../src/midi/types';
import type { MidiPlatformAdapter } from '../../src/midi/platform';
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

function setWidth(width: number) {
  mockUseWindowDimensions.mockReturnValue({ width, height: 1024, scale: 2, fontScale: 1 });
}

function adapterWithDevices(devices: readonly MidiDevice[]): MidiPlatformAdapter {
  return {
    getDevices: () => [...devices],
    subscribeToMessages: () => () => undefined,
    observeDevices: () => () => undefined,
  };
}

function renderSetup(options?: {
  seed?: readonly Keyboard[] | null;
  adapter?: MidiPlatformAdapter;
}) {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider adapter={options?.adapter ?? createNoopAdapter()}>
        <KeyboardsProvider
          loader={async () => options?.seed ?? null}
          saver={async () => undefined}
        >
          <SetupView />
        </KeyboardsProvider>
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('SetupView — US1 single keyboard', () => {
  beforeEach(() => {
    setWidth(800);
  });

  it('renders exactly one keyboard on first launch (default state)', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    // Only one keyboard row.
    const sizeAnchors = screen.queryAllByLabelText(/^Size, \d+ keys \([A-G]#?\d+-[A-G]#?\d+\)$/);
    expect(sizeAnchors).toHaveLength(1);
  });

  it('single-keyboard state hides device/channel/nickname/delete controls', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    // No multi-keyboard-only controls in the tree.
    expect(screen.queryByLabelText('Device')).toBeNull();
    expect(screen.queryByLabelText('Channel')).toBeNull();
    expect(screen.queryByLabelText('Nickname')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete Keyboard' })).toBeNull();
  });

  it('on tablet width (800), renders the <Keyboard> visualization for the keyboard', async () => {
    setWidth(800);
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    // The feature-004 Keyboard component's default testID is "keyboard".
    expect(screen.getByTestId('keyboard')).toBeTruthy();
  });

  it('on phone width (400), does NOT render the <Keyboard> visualization', async () => {
    setWidth(400);
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId('keyboard')).toBeNull();
  });

  it('the size dropdown offers the built-in ranges including same-count alternates', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    const sizeAnchor = screen.getByLabelText(/^Size, 88 keys \(A0-C8\)$/);
    act(() => {
      fireEvent.press(sizeAnchor);
    });
    const menuLabels = screen
      .getAllByRole('menuitem')
      .map((n) => n.props.accessibilityLabel);
    expect(menuLabels).toEqual([
      '25 keys (C3-C5)',
      '37 keys (C3-C6)',
      '49 keys (C2-C6)',
      '49 keys (C3-C7)',
      '61 keys (F1-F6)',
      '61 keys (C2-C7)',
      '73 keys (E1-E7)',
      '76 keys (E1-G7)',
      '76 keys (A1-C8)',
      '88 keys (A0-C8)',
    ]);
  });

  it('selecting a new size updates the displayed label', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThan(0);
    });
    const sizeAnchor = screen.getByLabelText(/^Size, 88 keys \(A0-C8\)$/);
    act(() => {
      fireEvent.press(sizeAnchor);
    });
    // The menu is open. Each option has accessibilityRole="menuitem" and
    // accessibilityLabel matching its label — find the "61 keys" option.
    const option61 = screen
      .getAllByRole('menuitem')
      .find((n) => n.props.accessibilityLabel === '61 keys (C2-C7)');
    expect(option61).toBeTruthy();
    act(() => {
      fireEvent.press(option61!);
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/^Size, 61 keys \(C2-C7\)$/)).toBeTruthy();
    });
  });

  it('renders the Add Keyboard button', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getByTestId('setup-add-keyboard')).toBeTruthy();
    });
  });
});

describe('SetupView — US2 multi-keyboard', () => {
  beforeEach(() => {
    setWidth(800);
  });

  function seedTwoKeyboards(): readonly Keyboard[] {
    return [
      { id: 'a', lowKey: 36, highKey: 96, deviceName: null, channel: null, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
  }

  it('with two keyboards, device + nickname + delete + display-name heading render on both', async () => {
    renderSetup({ seed: seedTwoKeyboards() });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a')).toBeTruthy();
    });
    // Display-name headings: "Keyboard 1" and "Keyboard 2".
    expect(screen.getByTestId('setup-keyboard-a-name').props.children).toBe('Keyboard 1');
    expect(screen.getByTestId('setup-keyboard-b-name').props.children).toBe('Keyboard 2');
    // Multi-only controls.
    expect(screen.getByTestId('setup-keyboard-a-device')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-b-device')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-a-nickname')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-b-nickname')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-a-delete')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-b-delete')).toBeTruthy();
    // Channel dropdown is NOT present when keyboards have no device yet.
    expect(screen.queryByTestId('setup-keyboard-a-channel')).toBeNull();
    expect(screen.queryByTestId('setup-keyboard-b-channel')).toBeNull();
  });

  it('empty device list renders "<No input detected>" placeholder on the anchor', async () => {
    renderSetup({ seed: seedTwoKeyboards() });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-device')).toBeTruthy();
    });
    // Feature 002's no-op adapter yields an empty devices list.
    const deviceAnchor = screen.getByTestId('setup-keyboard-a-device');
    // Anchor is disabled and shows the placeholder text.
    expect(deviceAnchor.props.accessibilityState?.disabled).toBe(true);
  });

  it('conflict warning surfaces when two keyboards share device AND channel', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 1, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 1, nickname: null },
    ];
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a')).toBeTruthy();
    });
    expect(screen.getByTestId('setup-keyboard-a-conflict-warning')).toBeTruthy();
    expect(screen.getByTestId('setup-keyboard-b-conflict-warning')).toBeTruthy();
  });

  it('different channels on the same device do NOT conflict', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 1, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 2, nickname: null },
    ];
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a')).toBeTruthy();
    });
    expect(screen.queryByTestId('setup-keyboard-a-conflict-warning')).toBeNull();
    expect(screen.queryByTestId('setup-keyboard-b-conflict-warning')).toBeNull();
  });

  it('channel dropdown appears on both keyboards when they share a device', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 1, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 2, nickname: null },
    ];
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-channel')).toBeTruthy();
    });
    expect(screen.getByTestId('setup-keyboard-b-channel')).toBeTruthy();
  });

  it('typing in nickname updates the display-name heading', async () => {
    renderSetup({ seed: seedTwoKeyboards() });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-nickname')).toBeTruthy();
    });
    act(() => {
      fireEvent.changeText(screen.getByTestId('setup-keyboard-a-nickname'), 'Upper');
    });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-name').props.children).toBe('Upper');
    });
  });

  it('clearing nickname to empty string reverts display-name heading to "Keyboard N"', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: 'Upper' },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-name').props.children).toBe('Upper');
    });
    act(() => {
      fireEvent.changeText(screen.getByTestId('setup-keyboard-a-nickname'), '');
    });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-name').props.children).toBe('Keyboard 1');
    });
  });

  it('deleting one of two keyboards reverts the survivor to single-keyboard layout', async () => {
    renderSetup({ seed: seedTwoKeyboards() });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-delete')).toBeTruthy();
    });
    act(() => {
      fireEvent.press(screen.getByTestId('setup-keyboard-a-delete'));
    });
    // The remaining keyboard (b) should no longer show multi-only controls.
    await waitFor(() => {
      expect(screen.queryByTestId('setup-keyboard-a')).toBeNull();
    });
    expect(screen.queryByTestId('setup-keyboard-b-device')).toBeNull();
    expect(screen.queryByTestId('setup-keyboard-b-nickname')).toBeNull();
    expect(screen.queryByTestId('setup-keyboard-b-delete')).toBeNull();
    expect(screen.queryByTestId('setup-keyboard-b-name')).toBeNull();
  });

  it('on tablet, all <Keyboard> visualizations share the same outer height (row-agnostic common height)', async () => {
    // Seed two keyboards with very different ranges — a 25-key (narrow) and an
    // 88-key (wide). Under the common-height rule both must render at the same
    // outer height regardless of key count.
    const seed: readonly Keyboard[] = [
      { id: 'tiny', lowKey: 48, highKey: 72, deviceName: null, channel: null, nickname: null },
      { id: 'huge', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
    setWidth(1000);
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-tiny')).toBeTruthy();
    });
    // Fire the ScrollView onLayout so SetupView computes a contentWidth.
    const scroll = screen.getByTestId('setup-view');
    act(() => {
      fireEvent(scroll, 'layout', {
        nativeEvent: { layout: { width: 1000, height: 1000, x: 0, y: 0 } },
      });
    });

    // Both <Keyboard> roots should now carry an explicit height in style.
    const keyboardRoots = screen.getAllByTestId('keyboard');
    expect(keyboardRoots.length).toBe(2);
    const heights = keyboardRoots.map((n) => {
      const s = Array.isArray(n.props.style)
        ? Object.assign({}, ...n.props.style.filter(Boolean))
        : n.props.style;
      return Number(s.height);
    });
    expect(heights[0]).toBeGreaterThan(0);
    expect(heights[0]).toBeCloseTo(heights[1], 6);
  });

  it('Add Keyboard appends a new 88-key entry', async () => {
    renderSetup();
    await waitFor(() => {
      expect(screen.getByTestId('setup-add-keyboard')).toBeTruthy();
    });
    // Initially one "88 keys" anchor.
    expect(screen.getAllByText(/^88 keys \(A0-C8\)$/).length).toBeGreaterThanOrEqual(1);
    act(() => {
      fireEvent.press(screen.getByTestId('setup-add-keyboard'));
    });
    await waitFor(() => {
      // Now two keyboards; two size anchors showing "88 keys".
      const sizeAnchors = screen.queryAllByLabelText(/^Size, \d+ keys \([A-G]#?\d+-[A-G]#?\d+\)$/);
      expect(sizeAnchors.length).toBe(2);
    });
  });
});

describe('SetupView — US3 disconnected device', () => {
  beforeEach(() => {
    setWidth(800);
  });

  it('shows the device-warning icon when stored deviceName is not in the live list', async () => {
    // Two keyboards; one assigned to "Roland A-49" which is NOT currently connected.
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland A-49', channel: null, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
    renderSetup({ seed });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-device')).toBeTruthy();
    });
    expect(screen.getByTestId('setup-keyboard-a-device-warning')).toBeTruthy();
    // Anchor a11y label carries the "disconnected" prefix.
    const anchor = screen.getByTestId('setup-keyboard-a-device');
    expect(anchor.props.accessibilityLabel).toContain('disconnected');
  });

  it('does NOT show the device-warning icon when the stored deviceName is currently connected', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland A-49', channel: null, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
    renderSetup({
      seed,
      adapter: adapterWithDevices([
        { id: 'd1', name: 'Roland A-49', transport: 'usb' },
      ]),
    });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-device')).toBeTruthy();
    });
    expect(screen.queryByTestId('setup-keyboard-a-device-warning')).toBeNull();
    const anchor = screen.getByTestId('setup-keyboard-a-device');
    expect(anchor.props.accessibilityLabel).not.toContain('disconnected');
  });

  it('the stored-but-disconnected device appears as an option when the dropdown opens', async () => {
    const seed: readonly Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Roland A-49', channel: null, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
    ];
    renderSetup({
      seed,
      adapter: adapterWithDevices([
        { id: 'd1', name: 'Arturia KeyLab', transport: 'usb' },
      ]),
    });
    await waitFor(() => {
      expect(screen.getByTestId('setup-keyboard-a-device')).toBeTruthy();
    });
    // Open keyboard a's device dropdown.
    act(() => {
      fireEvent.press(screen.getByTestId('setup-keyboard-a-device'));
    });
    // Options must include both the connected device and the stored-disconnected one.
    const menuLabels = screen
      .getAllByRole('menuitem')
      .map((n) => n.props.accessibilityLabel);
    expect(menuLabels).toContain('Arturia KeyLab');
    expect(menuLabels).toContain('Roland A-49');
  });
});

