import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';

function Probe() {
  const { mode, setMode } = useMode();
  return (
    <View>
      <Text testID="current-mode">{mode}</Text>
      <Pressable testID="to-perform" onPress={() => setMode('perform')}>
        <Text>go perform</Text>
      </Pressable>
      <Pressable testID="to-edit" onPress={() => setMode('edit')}>
        <Text>go edit</Text>
      </Pressable>
    </View>
  );
}

describe('ModeContext', () => {
  it('initial value is "edit" under a ModeProvider', () => {
    render(
      <ModeProvider>
        <Probe />
      </ModeProvider>,
    );
    expect(screen.getByTestId('current-mode').props.children).toBe('edit');
  });

  it('setMode("perform") flips mode to "perform"', () => {
    render(
      <ModeProvider>
        <Probe />
      </ModeProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('to-perform'));
    });
    expect(screen.getByTestId('current-mode').props.children).toBe('perform');
  });

  it('setMode("edit") flips mode back to "edit" from "perform"', () => {
    render(
      <ModeProvider>
        <Probe />
      </ModeProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('to-perform'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('to-edit'));
    });
    expect(screen.getByTestId('current-mode').props.children).toBe('edit');
  });

  it('useMode() outside a ModeProvider throws a developer-facing error', () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/ModeProvider/);
    } finally {
      console.error = originalError;
    }
  });
});
