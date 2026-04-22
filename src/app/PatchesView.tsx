import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function PatchesView() {
  return (
    <View testID="view-patches" style={styles.root}>
      <Text style={styles.label}>Patches</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
