import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, View } from 'react-native';
import { Shell } from '../../src/app/Shell';
import { KeyboardsProvider } from '../../src/keyboards/KeyboardsContext';
import { MidiInputProvider } from '../../src/midi/MidiInputContext';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { PreferencesProvider } from '../../src/prefs/PreferencesContext';

function EnterPerform() {
  const { setMode } = useMode();
  return (
    <Pressable testID="enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

describe('MIDI activity visibility (FR-013 / SC-008)', () => {
  it('is visible in Edit mode and absent in Perform mode', () => {
    render(
      <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
        <MidiInputProvider>
          <ModeProvider>
            <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
              <Shell />
              <EnterPerform />
            </KeyboardsProvider>
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>,
    );
    expect(screen.queryByTestId('midi-activity')).toBeTruthy();
    act(() => {
      fireEvent.press(screen.getByTestId('enter-perform'));
    });
    expect(screen.queryByTestId('midi-activity')).toBeNull();
    expect(screen.queryByTestId('perform-surface')).toBeTruthy();
  });
});
