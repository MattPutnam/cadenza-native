import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMode } from '../mode/useMode';
import { colors } from '../theme/colors';

export function PerformMode() {
  const { setMode } = useMode();
  const [closeFocused, setCloseFocused] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <View testID="perform-surface" style={styles.surface}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Exit Perform mode"
        focusable
        onPress={() => setMode('edit')}
        onFocus={() => setCloseFocused(true)}
        onBlur={() => setCloseFocused(false)}
        hitSlop={12}
        style={[
          styles.closeButton,
          { top: 16 + insets.top, left: 16 + insets.left },
          closeFocused && styles.closeButtonFocused,
        ]}
      >
        <Ionicons name="close" size={28} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    backgroundColor: colors.performBlack,
  },
  closeButton: {
    position: 'absolute',
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonFocused: {
    borderColor: colors.focusRing,
    borderWidth: 2,
  },
});
