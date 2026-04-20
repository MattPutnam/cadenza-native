import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { PerformMode } from '../../src/app/PerformMode';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { colors } from '../../src/theme/colors';

function ModeProbe() {
  const { mode } = useMode();
  return <Text testID="probed-mode">{mode}</Text>;
}

function EnterPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="harness-enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

describe('PerformMode', () => {
  it('fills the screen with the dark theme performBlack token', () => {
    render(
      <ModeProvider>
        <PerformMode />
      </ModeProvider>,
    );
    const surface = screen.getByTestId('perform-surface');
    const flattened = Array.isArray(surface.props.style)
      ? Object.assign({}, ...surface.props.style)
      : surface.props.style;
    expect(flattened.backgroundColor).toBe(colors.performBlack);
  });

  it('renders no header landmark', () => {
    render(
      <ModeProvider>
        <PerformMode />
      </ModeProvider>,
    );
    expect(screen.queryByTestId('edit-header')).toBeNull();
  });

  it('renders an accessible close control labeled "Exit Perform mode"', () => {
    render(
      <ModeProvider>
        <PerformMode />
      </ModeProvider>,
    );
    const close = screen.getByRole('button', { name: 'Exit Perform mode' });
    expect(close).toBeTruthy();
  });

  it('activating the close control flips app mode from "perform" to "edit"', () => {
    render(
      <ModeProvider>
        <PerformMode />
        <ModeProbe />
        <EnterPerform />
      </ModeProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    expect(screen.getByTestId('probed-mode').props.children).toBe('perform');
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Exit Perform mode' }));
    });
    expect(screen.getByTestId('probed-mode').props.children).toBe('edit');
  });
});
