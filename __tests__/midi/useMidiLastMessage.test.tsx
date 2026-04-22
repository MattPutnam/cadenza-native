import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { useMidiLastMessage } from '../../src/midi/useMidiLastMessage';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';
import { MidiMock } from '../helpers/midiMock';

function Probe() {
  const msg = useMidiLastMessage();
  return <Text testID="last-type">{msg ? msg.type : 'none'}</Text>;
}

beforeEach(() => {
  MidiMock.__reset();
});

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function renderTree() {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <Probe />
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('useMidiLastMessage', () => {
  it('returns null until the first message arrives', async () => {
    renderTree();
    await flush();
    expect(screen.getByTestId('last-type').props.children).toBe('none');
  });

  it('coalesces multiple messages within a single frame into one render (latest wins)', async () => {
    renderTree();
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]); // noteOn
      MidiMock.__fireMessage([0xb0, 7, 64]); // controlChange
      MidiMock.__fireMessage([0xc0, 42]); // programChange
    });
    // rAF coalesces the three pushes into one setState. Let the frame promote.
    await waitFor(() =>
      expect(screen.getByTestId('last-type').props.children).toBe('programChange'),
    );
  });

  it('updates on subsequent messages after the first render', async () => {
    renderTree();
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('last-type').props.children).toBe('noteOn'),
    );
    act(() => {
      MidiMock.__fireMessage([0xb0, 7, 64]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('last-type').props.children).toBe('controlChange'),
    );
  });
});
