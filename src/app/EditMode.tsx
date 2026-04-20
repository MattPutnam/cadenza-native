import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMode } from '../mode/useMode';
import { colors } from '../theme/colors';

export function EditMode() {
  const { setMode } = useMode();
  const [performFocused, setPerformFocused] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View
        testID="edit-header"
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
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
      </View>
      <View style={styles.body} />
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
    justifyContent: 'flex-start',
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
  body: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
