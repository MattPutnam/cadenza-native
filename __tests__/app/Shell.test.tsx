import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { Shell } from '../../src/app/Shell';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';

function EnterPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="harness-enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

function ExitPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="harness-exit-perform" onPress={() => setMode('edit')}>
      <View />
    </Pressable>
  );
}

describe('Shell', () => {
  it('renders EditMode when mode is "edit"', () => {
    render(
      <ModeProvider>
        <Shell />
      </ModeProvider>,
    );
    expect(screen.queryByTestId('edit-header')).toBeTruthy();
    expect(screen.queryByTestId('perform-surface')).toBeNull();
  });

  it('renders PerformMode when mode is "perform"', () => {
    render(
      <ModeProvider>
        <Shell />
        <EnterPerform />
      </ModeProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    expect(screen.queryByTestId('edit-header')).toBeNull();
    expect(screen.queryByTestId('perform-surface')).toBeTruthy();
  });

  it('rounds-trip back to EditMode when leaving Perform mode', () => {
    render(
      <ModeProvider>
        <Shell />
        <EnterPerform />
        <ExitPerform />
      </ModeProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('harness-exit-perform'));
    });
    expect(screen.queryByTestId('edit-header')).toBeTruthy();
    expect(screen.queryByTestId('perform-surface')).toBeNull();
  });
});
