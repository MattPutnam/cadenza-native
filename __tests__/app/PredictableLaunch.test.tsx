import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
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
    <Pressable testID="harness-enter-perform" onPress={() => setMode('perform')}>
      <View />
    </Pressable>
  );
}

function wrapTree(children: React.ReactNode) {
  return (
    <PreferencesProvider loader={() => Promise.resolve({})} saver={() => Promise.resolve()}>
      <MidiInputProvider>
        <ModeProvider>
          <KeyboardsProvider loader={async () => null} saver={async () => undefined}>
            {children}
          </KeyboardsProvider>
        </ModeProvider>
      </MidiInputProvider>
    </PreferencesProvider>
  );
}

describe('Predictable launch state (US2)', () => {
  it('cold-launches in edit mode regardless of prior session state', () => {
    // Drive a first "session" into perform mode.
    const first = render(
      wrapTree(
        <>
          <Shell />
          <EnterPerform />
        </>,
      ),
    );
    act(() => {
      fireEvent.press(screen.getByTestId('harness-enter-perform'));
    });
    expect(screen.queryByTestId('perform-surface')).toBeTruthy();

    // Fully unmount (simulating the user closing the app).
    first.unmount();

    // Mount a fresh provider + shell (simulating a cold launch).
    render(wrapTree(<Shell />));

    // The new session must land in edit mode, not perform.
    expect(screen.queryByTestId('edit-header')).toBeTruthy();
    expect(screen.queryByTestId('perform-surface')).toBeNull();
  });

  it('ModeContext.tsx does not import any persistent storage module', () => {
    // FR-002 prohibits persisting mode. Scan actual import/require statements
    // (not comments) for the usual storage modules.
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'mode', 'ModeContext.tsx'),
      'utf8',
    );
    // Strip single-line and block comments before matching, so doc notes that
    // mention forbidden modules don't trigger the guard.
    const codeOnly = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    const forbiddenImports = [
      /from\s+['"]@react-native-async-storage\/async-storage['"]/,
      /from\s+['"]expo-secure-store['"]/,
      /from\s+['"]react-native-mmkv['"]/,
      /from\s+['"]react-native-keychain['"]/,
      /require\(\s*['"]@react-native-async-storage\/async-storage['"]\s*\)/,
      /require\(\s*['"]expo-secure-store['"]\s*\)/,
      /require\(\s*['"]react-native-mmkv['"]\s*\)/,
      /require\(\s*['"]react-native-keychain['"]\s*\)/,
    ];
    for (const pattern of forbiddenImports) {
      expect(codeOnly).not.toMatch(pattern);
    }
  });
});
