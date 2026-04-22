import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { MidiInputProvider, useMidiInput } from '../../src/midi/MidiInputContext';
import { createNoopAdapter } from '../../src/midi/platform';
import type { MidiMessage } from '../../src/midi/types';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { MidiMock } from '../helpers/midiMock';

beforeEach(() => {
  MidiMock.__reset();
});

/** Flush pending microtasks + effects inside act. */
async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function Probe({
  onMessage,
  onDevices,
}: {
  onMessage?: (msg: MidiMessage) => void;
  onDevices?: (n: number) => void;
}) {
  const { subscribe, devices } = useMidiInput();
  useEffect(() => {
    if (onMessage) return subscribe(onMessage);
    return undefined;
  }, [subscribe, onMessage]);
  useEffect(() => {
    onDevices?.(devices.length);
  }, [devices, onDevices]);
  return (
    <View>
      <Text testID="device-count">{String(devices.length)}</Text>
    </View>
  );
}

function renderWithProviders(
  children: React.ReactNode,
  opts?: { seeded?: Record<string, unknown>; neverLoad?: boolean; adapter?: ReturnType<typeof createNoopAdapter> },
) {
  const loader = opts?.neverLoad
    ? () => new Promise<Partial<Record<string, never>>>(() => {})
    : () => Promise.resolve(opts?.seeded ?? {});
  return render(
    <PreferencesProvider loader={loader as () => Promise<Partial<Record<string, never>>>} saver={() => Promise.resolve()}>
      <MidiInputProvider adapter={opts?.adapter}>{children}</MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('MidiInputContext', () => {
  it('delivers parsed Note On to a subscriber (once prefs are loaded)', async () => {
    const received: MidiMessage[] = [];
    renderWithProviders(<Probe onMessage={(m) => received.push(m)} />);
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100], 'dev1', 42);
    });
    expect(received.length).toBe(1);
    expect(received[0]).toMatchObject({ type: 'noteOn', channel: 1, note: 60, velocity: 100 });
  });

  it('unsubscribe stops delivery', async () => {
    let received = 0;
    function OneShot() {
      const { subscribe } = useMidiInput();
      const [armed, setArmed] = useState(true);
      useEffect(() => {
        if (!armed) return undefined;
        return subscribe(() => {
          received++;
          setArmed(false);
        });
      }, [subscribe, armed]);
      return null;
    }
    renderWithProviders(<OneShot />);
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(received).toBe(1);
    // After the first message, armed=false → OneShot unsubscribes.
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 61, 100]);
    });
    expect(received).toBe(1);
  });

  it('listener that throws does not prevent other listeners from receiving', async () => {
    let secondCount = 0;
    function Two() {
      const { subscribe } = useMidiInput();
      useEffect(() => {
        const unsub1 = subscribe(() => {
          throw new Error('boom');
        });
        const unsub2 = subscribe(() => {
          secondCount++;
        });
        return () => {
          unsub1();
          unsub2();
        };
      }, [subscribe]);
      return null;
    }
    renderWithProviders(<Two />);
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(secondCount).toBe(1);
  });

  it('devices list updates on __fireDeviceChange', async () => {
    let observed = 0;
    renderWithProviders(<Probe onDevices={(n) => (observed = n)} />);
    await flush();
    expect(observed).toBe(0);
    act(() => {
      MidiMock.__fireDeviceChange({
        type: 'added',
        device: { id: 'd1', name: 'Test', transport: 'usb' },
      });
    });
    expect(observed).toBe(1);
    act(() => {
      MidiMock.__fireDeviceChange({
        type: 'removed',
        device: { id: 'd1', name: 'Test', transport: 'usb' },
      });
    });
    expect(observed).toBe(0);
  });

  it('messages fired before prefs load are NOT delivered to subscribers', () => {
    let received = 0;
    renderWithProviders(<Probe onMessage={() => received++} />, { neverLoad: true });
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(received).toBe(0);
  });

  it('SysEx is filtered when prefs.ignoreSysEx is true', async () => {
    const received: MidiMessage[] = [];
    renderWithProviders(<Probe onMessage={(m) => received.push(m)} />, {
      seeded: { ignoreSysEx: true },
    });
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]); // noteOn — passes
      MidiMock.__fireMessage([0xf0, 0x01, 0xf7]); // sysex — filtered
    });
    expect(received.length).toBe(1);
    expect(received[0].type).toBe('noteOn');
  });

  it('with the no-op adapter, children render and subscribe is a no-op', async () => {
    let received = 0;
    renderWithProviders(<Probe onMessage={() => received++} />, {
      adapter: createNoopAdapter(),
    });
    await flush();
    expect(screen.getByTestId('device-count').props.children).toBe('0');
    // Firing on the mock does NOT reach this provider's subscribers (it uses
    // the injected no-op adapter instead).
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(received).toBe(0);
  });
});
