import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Keyboard as KeyboardDisplay } from '../keyboard/Keyboard';
import type { MidiDevice } from '../midi/types';
import { colors } from '../theme/colors';
import { KeyboardControls } from './KeyboardControls';
import type { Keyboard } from './types';

export interface KeyboardRowProps {
  readonly keyboard: Keyboard;
  readonly position: number;
  readonly isOnlyKeyboard: boolean;
  readonly devices: readonly MidiDevice[];
  readonly isInConflict: boolean;
  readonly sharedDeviceSiblings: readonly Keyboard[];
  readonly onChange: (patch: Partial<Omit<Keyboard, 'id'>>) => void;
  readonly onDelete: () => void;
  /**
   * Outer height (pt) to force on the `<Keyboard>` visualization, so every
   * row in Setup shares the same vertical rhythm. When omitted, the keyboard
   * fills its own slot's width as usual.
   */
  readonly keyboardHeight?: number;
}

/** Tablet-layout wrapper: controls row on top, <Keyboard> visualization below. */
export function KeyboardRow({ keyboardHeight, ...props }: KeyboardRowProps) {
  const idPrefix = `setup-keyboard-${props.keyboard.id}`;
  return (
    <View testID={idPrefix} style={styles.root}>
      <KeyboardControls {...props} layout="tablet" />
      <View testID={`${idPrefix}-visual`} style={styles.visual}>
        <KeyboardDisplay
          low={props.keyboard.lowKey}
          high={props.keyboard.highKey}
          highlighted={[]}
          height={keyboardHeight}
        />
      </View>
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

/**
 * Horizontal padding (pt) on each side of the `<Keyboard>` visualization
 * inside a KeyboardRow. Exported so `SetupView` can derive the exact inner
 * slot width when computing a row-agnostic common keyboard height.
 */
export const KEYBOARD_ROW_VISUAL_HORIZONTAL_PADDING = 16;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingVertical: 12,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  visual: {
    paddingHorizontal: KEYBOARD_ROW_VISUAL_HORIZONTAL_PADDING,
    paddingTop: 4,
    paddingBottom: 8,
    alignItems: 'center',
  },
  conflict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  conflictText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
});
