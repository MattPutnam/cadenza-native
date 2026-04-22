import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { BORDER_WIDTH } from '../keyboard/Keyboard';
import { KEY_ASPECT } from '../keyboard/layout';
import { whiteKeyCount } from '../keyboard/notes';
import { KeyboardCard } from '../keyboards/KeyboardCard';
import {
  KeyboardRow,
  KEYBOARD_ROW_VISUAL_HORIZONTAL_PADDING,
} from '../keyboards/KeyboardRow';
import { detectConflicts } from '../keyboards/conflicts';
import { useKeyboards } from '../keyboards/useKeyboards';
import type { Keyboard } from '../keyboards/types';
import { useLayoutMode } from '../layout/useLayoutMode';
import { useMidiInput } from '../midi/MidiInputContext';
import { colors } from '../theme/colors';

/** Horizontal padding (pt) on each side of the scroll content. */
const CONTENT_HORIZONTAL_PADDING = 12;
/** White-key count for the 88-key reference used to compute the common height. */
const REFERENCE_WHITE_KEY_COUNT = whiteKeyCount(21, 108); // 52

export function SetupView() {
  const { keyboards, isLoaded, add, update, remove } = useKeyboards();
  const { devices } = useMidiInput();
  const layoutMode = useLayoutMode();

  const [contentWidth, setContentWidth] = useState(0);

  const conflictIds = useMemo(() => detectConflicts(keyboards), [keyboards]);

  /**
   * On tablet, enforce the same outer height on every `<Keyboard>` so rows
   * share a vertical rhythm regardless of key count. Target height is the
   * height an 88-key keyboard would naturally take at the row's slot width —
   * i.e., the widest possible case fills the row, and smaller keyboards are
   * shorter/narrower but the same height.
   */
  const commonKeyboardHeight = useMemo(() => {
    if (layoutMode !== 'tablet' || contentWidth <= 0) return undefined;
    const rowOuterWidth = contentWidth - 2 * CONTENT_HORIZONTAL_PADDING;
    const slotOuterWidth =
      rowOuterWidth - 2 * KEYBOARD_ROW_VISUAL_HORIZONTAL_PADDING;
    const innerWidth = Math.max(0, slotOuterWidth - 2 * BORDER_WIDTH);
    if (innerWidth <= 0) return undefined;
    const whiteWidth = innerWidth / REFERENCE_WHITE_KEY_COUNT;
    const innerHeight = whiteWidth * KEY_ASPECT;
    return innerHeight + 2 * BORDER_WIDTH;
  }, [layoutMode, contentWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (next !== contentWidth) setContentWidth(next);
  };

  return (
    <ScrollView
      testID="setup-view"
      style={styles.root}
      contentContainerStyle={styles.content}
      onLayout={handleLayout}
    >
      {isLoaded &&
        keyboards.map((kb, index) => {
          const siblings = keyboards.filter(
            (k) => k.id !== kb.id && k.deviceName != null && k.deviceName === kb.deviceName,
          );
          const commonProps = {
            keyboard: kb,
            position: index,
            isOnlyKeyboard: keyboards.length === 1,
            devices,
            isInConflict: conflictIds.has(kb.id),
            sharedDeviceSiblings: siblings as readonly Keyboard[],
            onChange: (patch: Partial<Omit<Keyboard, 'id'>>) => update(kb.id, patch),
            onDelete: () => remove(kb.id),
          };
          return layoutMode === 'tablet' ? (
            <KeyboardRow
              key={kb.id}
              {...commonProps}
              keyboardHeight={commonKeyboardHeight}
            />
          ) : (
            <KeyboardCard key={kb.id} {...commonProps} />
          );
        })}

      {isLoaded && (
        <Pressable
          testID="setup-add-keyboard"
          accessibilityRole="button"
          accessibilityLabel="Add Keyboard"
          onPress={add}
          hitSlop={8}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.addLabel}>Add Keyboard</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: CONTENT_HORIZONTAL_PADDING,
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  addButtonPressed: {
    backgroundColor: colors.menuItemPressed,
  },
  addLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
