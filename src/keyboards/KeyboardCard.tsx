import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { MidiDevice } from '../midi/types';
import { colors } from '../theme/colors';
import { KeyboardControls } from './KeyboardControls';
import type { Keyboard } from './types';

export interface KeyboardCardProps {
  readonly keyboard: Keyboard;
  readonly position: number;
  readonly isOnlyKeyboard: boolean;
  readonly devices: readonly MidiDevice[];
  readonly isInConflict: boolean;
  readonly sharedDeviceSiblings: readonly Keyboard[];
  readonly onChange: (patch: Partial<Omit<Keyboard, 'id'>>) => void;
  readonly onDelete: () => void;
}

/** Phone-layout wrapper: controls stacked inside a card; no <Keyboard> visualization. */
export function KeyboardCard(props: KeyboardCardProps) {
  const idPrefix = `setup-keyboard-${props.keyboard.id}`;
  return (
    <View testID={idPrefix} style={styles.root}>
      <KeyboardControls {...props} layout="phone" />
      {props.isInConflict && (
        <View
          testID={`${idPrefix}-conflict-warning`}
          accessibilityRole="alert"
          style={styles.conflict}
        >
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={styles.conflictText} numberOfLines={2}>
            Channel conflict: two keyboards on the same device and channel.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  conflict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  conflictText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
});
