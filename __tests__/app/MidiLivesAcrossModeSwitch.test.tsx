import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { Shell } from '../../src/app/Shell';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider, useMidiInput } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { MidiMock } from '../helpers/midiMock';

beforeEach(() => {
  MidiMock.__reset();
});

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function EnterPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

function ExitPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="exit-perform" onPress={() => setMode('edit')}>
      <View />
    </Pressable>
  );
}

describe('MIDI subsystem lifetime (FR-004)', () => {
  it('keeps delivering messages to subscribers across mode switches', async () => {
    let delivered = 0;
    function Spy() {
      const { subscribe } = useMidiInput();
      useEffect(() => subscribe(() => delivered++), [subscribe]);
      return null;
    }

    render(
      <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
        <MidiInputProvider>
          <ModeProvider>
            <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
              <Shell />
              <Spy />
              <EnterPerform />
              <ExitPerform />
            </KeyboardsProvider>
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>,
    );
    await flush();

    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    expect(delivered).toBe(1);

    act(() => {
      fireEvent.press(screen.getByTestId('enter-perform'));
    });
    act(() => {
      MidiMock.__fireMessage([0x90, 61, 100]);
    });
    expect(delivered).toBe(2);

    act(() => {
      fireEvent.press(screen.getByTestId('exit-perform'));
    });
    act(() => {
      MidiMock.__fireMessage([0x90, 62, 100]);
    });
    expect(delivered).toBe(3);
  });
});
