import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutMode } from '../layout/useLayoutMode';
import { useMode } from '../mode/useMode';
import { colors } from '../theme/colors';
import { EditViewBody } from './EditViewBody';
import { EditViewHeaderControl } from './EditViewHeaderControl';
import { MidiActivityDisplay } from './MidiActivityDisplay';
import { PreferencesMenu } from './PreferencesMenu';

export function EditMode() {
  const { setMode } = useMode();
  const [performFocused, setPerformFocused] = useState(false);
  const [prefsFocused, setPrefsFocused] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const layoutMode = useLayoutMode();

  return (
    <View style={styles.container}>
      <View
        testID="edit-header"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        {layoutMode === 'tablet' ? (
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Perform"
            focusable
            onPress={() => setMode('perform')}
            onFocus={() => setPerformFocused(true)}
            onBlur={() => setPerformFocused(false)}
            hitSlop={12}
            style={({ pressed }) => [
              styles.performButton,
              pressed && styles.performButtonPressed,
              performFocused && styles.performButtonFocused,
            ]}
          >
            <Text style={styles.performLabel}>Perform</Text>
          </Pressable>
        ) : null}
        <EditViewHeaderControl />
        <MidiActivityDisplay />
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Preferences"
          focusable
          onPress={() => setPrefsOpen(true)}
          onFocus={() => setPrefsFocused(true)}
          onBlur={() => setPrefsFocused(false)}
          hitSlop={12}
          style={[styles.prefsButton, prefsFocused && styles.prefsButtonFocused]}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>
      <EditViewBody />
      <PreferencesMenu visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    width: '100%',
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surfaceElevated,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  performButton: {
    minWidth: 104,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  performButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  performButtonFocused: {
    borderColor: colors.focusRing,
    borderWidth: 2,
  },
  performLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  prefsButton: {
    // Kept similar in width to the Perform button so MidiActivityDisplay stays
    // visually centered between them.
    minWidth: 104,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  prefsButtonFocused: {
    borderColor: colors.focusRing,
    borderWidth: 2,
  },
});
