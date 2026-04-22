import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function CuesView() {
  return (
    <View testID="view-cues" style={styles.root}>
      <Text style={styles.label}>Cues</Text>
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
