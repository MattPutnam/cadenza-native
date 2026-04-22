import { act, render, screen, waitFor } from '@testing-library/react-native';
import { MidiActivityDisplay } from '../../src/app/MidiActivityDisplay';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
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

function renderTree() {
  return render(
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <MidiActivityDisplay />
      </MidiInputProvider>
    </PreferencesProvider>,
  );
}

describe('MidiActivityDisplay', () => {
  it('shows the idle placeholder when no messages have been received', async () => {
    renderTree();
    await flush();
    expect(screen.getByTestId('midi-activity')).toBeTruthy();
    expect(screen.getByText(/No MIDI input/i)).toBeTruthy();
  });

  it('renders a formatted Note On after one is fired', async () => {
    renderTree();
    await flush();
    act(() => {
      MidiMock.__fireMessage([0x90, 60, 100]);
    });
    await waitFor(() => {
      expect(screen.getByText(/[Nn]ote ?[Oo]n/)).toBeTruthy();
    });
    const line = screen.getByText(/[Nn]ote ?[Oo]n/);
    const content = Array.isArray(line.props.children)
      ? line.props.children.join('')
      : String(line.props.children);
    expect(content).toContain('C4');
    expect(content).toContain('100');
  });
});
