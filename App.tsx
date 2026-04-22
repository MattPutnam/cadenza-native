import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from './src/app/Shell';
import { KeyboardsProvider } from './src/keyboards/KeyboardsContext';
import { MidiInputProvider } from './src/midi/MidiInputContext';
import { ModeProvider } from './src/mode/ModeContext';
import { PreferencesProvider } from './src/prefs/PreferencesContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <MidiInputProvider>
          <ModeProvider>
            <KeyboardsProvider>
              <Shell />
              <StatusBar style="light" />
            </KeyboardsProvider>
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
