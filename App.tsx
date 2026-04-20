import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Shell } from './src/app/Shell';
import { ModeProvider } from './src/mode/ModeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ModeProvider>
        <Shell />
        <StatusBar style="light" />
      </ModeProvider>
    </SafeAreaProvider>
  );
}
