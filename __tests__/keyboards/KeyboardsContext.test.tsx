import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { useKeyboards } from '../../src/keyboards/useKeyboards';
import type { Keyboard } from '../../src/keyboards/types';

function Probe() {
  const { keyboards, isLoaded, add, update, remove } = useKeyboards();
  return (
    <View>
      <Text testID="is-loaded">{isLoaded ? 'loaded' : 'loading'}</Text>
      <Text testID="count">{keyboards.length}</Text>
      <Text testID="summary">{keyboards.map((k) => `${k.id}:${k.lowKey}-${k.highKey}:${k.deviceName ?? 'x'}:${k.channel ?? 'x'}:${k.nickname ?? 'x'}`).join('|')}</Text>
      <Pressable testID="add" onPress={add}>
        <Text>add</Text>
      </Pressable>
      <Pressable
        testID="remove-first"
        onPress={() => keyboards[0] && remove(keyboards[0].id)}
      >
        <Text>remove-first</Text>
      </Pressable>
      <Pressable
        testID="set-device-1-to-X"
        onPress={() => keyboards[0] && update(keyboards[0].id, { deviceName: 'X' })}
      >
        <Text>set-device-1-X</Text>
      </Pressable>
      <Pressable
        testID="set-device-2-to-X"
        onPress={() => keyboards[1] && update(keyboards[1].id, { deviceName: 'X' })}
      >
        <Text>set-device-2-X</Text>
      </Pressable>
      <Pressable
        testID="set-size-1-to-61"
        onPress={() =>
          keyboards[0] && update(keyboards[0].id, { lowKey: 36, highKey: 96 })
        }
      >
        <Text>set-size-1-61</Text>
      </Pressable>
      <Pressable
        testID="set-first-to-Shared"
        onPress={() => keyboards[0] && update(keyboards[0].id, { deviceName: 'Shared' })}
      >
        <Text>set-first-Shared</Text>
      </Pressable>
    </View>
  );
}

function renderWithProvider(options?: {
  loader?: () => Promise<readonly Keyboard[] | null>;
  saver?: (k: readonly Keyboard[]) => Promise<void>;
}) {
  return render(
    <KeyboardsProvider loader={options?.loader} saver={options?.saver}>
      <Probe />
    </KeyboardsProvider>,
  );
}

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe('KeyboardsContext', () => {
  it('first-launch (read miss) synthesises a single 88-key keyboard without saving', async () => {
    const saver = jest.fn().mockResolvedValue(undefined);
    renderWithProvider({ loader: async () => null, saver });
    // Default state is present immediately.
    expect(screen.getByTestId('count').props.children).toBe(1);
    expect(screen.getByTestId('is-loaded').props.children).toBe('loading');
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('count').props.children).toBe(1);
    // Must NOT save the synthesised default on first mount.
    expect(saver).not.toHaveBeenCalled();
  });

  it('loads persisted keyboards when present', async () => {
    const persisted: Keyboard[] = [
      { id: 'a', lowKey: 36, highKey: 96, deviceName: 'Roland', channel: null, nickname: 'Upper' },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: 'Roland', channel: 1, nickname: 'Lower' },
    ];
    renderWithProvider({ loader: async () => persisted });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    expect(screen.getByTestId('count').props.children).toBe(2);
  });

  it('add() appends a new default 88-key and persists', async () => {
    const saver = jest.fn().mockResolvedValue(undefined);
    renderWithProvider({ loader: async () => null, saver });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('add'));
    });
    expect(screen.getByTestId('count').props.children).toBe(2);
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it('remove() is a no-op when only one keyboard remains', async () => {
    const saver = jest.fn().mockResolvedValue(undefined);
    renderWithProvider({ loader: async () => null, saver });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('remove-first'));
    });
    expect(screen.getByTestId('count').props.children).toBe(1);
    expect(saver).not.toHaveBeenCalled();
  });

  it('remove() removes a keyboard when more than one exists', async () => {
    renderWithProvider({ loader: async () => null });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('add'));
    });
    expect(screen.getByTestId('count').props.children).toBe(2);
    act(() => {
      fireEvent.press(screen.getByTestId('remove-first'));
    });
    expect(screen.getByTestId('count').props.children).toBe(1);
  });

  it('update() merges a partial patch and persists', async () => {
    const saver = jest.fn().mockResolvedValue(undefined);
    renderWithProvider({ loader: async () => null, saver });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('set-size-1-to-61'));
    });
    // 61-key range = C2..C7 (MIDI 36..96).
    expect(screen.getByTestId('summary').props.children).toContain(':36-96:');
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it('channel auto-defaults to 1 when two keyboards first share a device', async () => {
    renderWithProvider({ loader: async () => null });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('add'));
    });
    // Assign both to device X.
    act(() => {
      fireEvent.press(screen.getByTestId('set-device-1-to-X'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('set-device-2-to-X'));
    });
    // Second keyboard becomes the sharer — it gets the first unused channel: 1.
    // (First keyboard stays at channel=null because at assign time it was solo.)
    const summary = screen.getByTestId('summary').props.children as string;
    // Second slot should end with :1:x or :1:<nickname> — contains ":X:1:" segment.
    expect(summary).toMatch(/:X:1:/);
  });

  it('channel auto-default picks lowest unused channel when siblings already occupy 1..14', async () => {
    // Seed 14 siblings on "Shared" occupying channels 1..14, plus one solo
    // keyboard at index 0 with no device yet.
    const seed: Keyboard[] = [
      { id: 'solo', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
      ...Array.from({ length: 14 }, (_, i): Keyboard => ({
        id: `sib${i}`,
        lowKey: 21,
        highKey: 108,
        deviceName: 'Shared',
        channel: i + 1,
        nickname: null,
      })),
    ];
    renderWithProvider({ loader: async () => seed });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('set-first-to-Shared'));
    });
    // Expect the solo keyboard to be on Shared, channel 15.
    expect(screen.getByTestId('summary').props.children).toMatch(/^solo:21-108:Shared:15:/);
  });

  it('channel stays null when all 16 channels on the shared device are already taken', async () => {
    // Seed 16 siblings occupying 1..16, plus one solo keyboard.
    const seed: Keyboard[] = [
      { id: 'solo', lowKey: 21, highKey: 108, deviceName: null, channel: null, nickname: null },
      ...Array.from({ length: 16 }, (_, i): Keyboard => ({
        id: `sib${i}`,
        lowKey: 21,
        highKey: 108,
        deviceName: 'Shared',
        channel: i + 1,
        nickname: null,
      })),
    ];
    renderWithProvider({ loader: async () => seed });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('set-first-to-Shared'));
    });
    // Saturation edge case: channel remains null.
    expect(screen.getByTestId('summary').props.children).toMatch(/^solo:21-108:Shared:x:/);
  });

  it('moving a keyboard off a shared device resets its channel to null', async () => {
    const seed: Keyboard[] = [
      { id: 'a', lowKey: 21, highKey: 108, deviceName: 'Shared', channel: 1, nickname: null },
      { id: 'b', lowKey: 21, highKey: 108, deviceName: 'Shared', channel: 2, nickname: null },
    ];
    renderWithProvider({ loader: async () => seed });
    await waitFor(() =>
      expect(screen.getByTestId('is-loaded').props.children).toBe('loaded'),
    );
    // Move the first keyboard to a distinct device "X"; channel should reset to null.
    act(() => {
      fireEvent.press(screen.getByTestId('set-device-1-to-X'));
    });
    expect(screen.getByTestId('summary').props.children).toMatch(/^a:21-108:X:x:/);
  });

  it('useKeyboards() outside a provider throws a developer-facing error', () => {
    const originalError = console.error;
    console.error = () => undefined;
    try {
      expect(() => render(<Probe />)).toThrow(/KeyboardsProvider/);
    } finally {
      console.error = originalError;
    }
  });

  it('parse-error load returns null → provider uses default state', async () => {
    renderWithProvider({ loader: async () => null });
    await flush();
    expect(screen.getByTestId('count').props.children).toBe(1);
  });
});
