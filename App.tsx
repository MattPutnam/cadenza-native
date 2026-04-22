import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from './src/app/Shell';
import { MidiInputProvider } from './src/midi/MidiInputContext';
import { ModeProvider } from './src/mode/ModeContext';
import { PreferencesProvider } from './src/prefs/PreferencesContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <MidiInputProvider>
          <ModeProvider>
            <Shell />
            <StatusBar style="light" />
          </ModeProvider>
        </MidiInputProvider>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
