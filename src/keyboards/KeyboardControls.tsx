import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { toNoteName } from '../keyboard/notes';
import type { MidiDevice } from '../midi/types';
import { colors } from '../theme/colors';
import { Dropdown, type DropdownOption } from './Dropdown';
import { displayName } from './schema';
import { BUILT_IN_KEYBOARD_SIZES, type Keyboard } from './types';

function formatRange(low: number, high: number): string {
  return `${high - low + 1} keys (${toNoteName(low)}-${toNoteName(high)})`;
}

export interface KeyboardControlsProps {
  readonly keyboard: Keyboard;
  readonly position: number;
  readonly isOnlyKeyboard: boolean;
  readonly devices: readonly MidiDevice[];
  readonly isInConflict: boolean;
  readonly sharedDeviceSiblings: readonly Keyboard[];
  readonly onChange: (patch: Partial<Omit<Keyboard, 'id'>>) => void;
  readonly onDelete: () => void;
  readonly layout: 'tablet' | 'phone';
}

export function KeyboardControls({
  keyboard,
  position,
  isOnlyKeyboard,
  devices,
  sharedDeviceSiblings,
  onChange,
  onDelete,
  layout,
}: KeyboardControlsProps) {
  const idPrefix = `setup-keyboard-${keyboard.id}`;
  const name = displayName(keyboard, position);

  // Size dropdown: one option per built-in preset. The Dropdown's value is the
  // preset's index; a value of -1 means the stored range doesn't match any
  // preset (i.e., a custom range — future feature).
  const sizeOptions: readonly DropdownOption<number>[] = BUILT_IN_KEYBOARD_SIZES.map(
    (r, i) => ({ value: i, label: formatRange(r.low, r.high) }),
  );
  const currentSizeIndex = BUILT_IN_KEYBOARD_SIZES.findIndex(
    (r) => r.low === keyboard.lowKey && r.high === keyboard.highKey,
  );
  const sizeAnchorLabel =
    currentSizeIndex !== -1
      ? `Size, ${formatRange(keyboard.lowKey, keyboard.highKey)}`
      : `Size, ${toNoteName(keyboard.lowKey)}-${toNoteName(keyboard.highKey)} (custom)`;

  // Resolve device dropdown state. Connected names, deduplicated and sorted.
  const liveNames = Array.from(new Set(devices.map((d) => d.name))).sort();
  const storedDisconnected =
    keyboard.deviceName != null && !liveNames.includes(keyboard.deviceName)
      ? keyboard.deviceName
      : null;
  const deviceOptionNames = storedDisconnected
    ? [...liveNames, storedDisconnected].sort()
    : liveNames;
  const deviceListEmpty = deviceOptionNames.length === 0;

  const deviceOptions: readonly DropdownOption<string>[] = deviceOptionNames.map((n) => ({
    value: n,
    label: n,
    trailingIcon:
      n === storedDisconnected ? (
        <Ionicons name="warning" size={14} color={colors.warning} />
      ) : undefined,
  }));

  const anchorDeviceLabel = keyboard.deviceName ?? '<No input detected>';
  const showDisconnectedWarning = storedDisconnected != null;

  // Channel dropdown visibility + options.
  const showChannel = !isOnlyKeyboard && sharedDeviceSiblings.length >= 1;
  const channelOptions: readonly DropdownOption<number>[] = Array.from(
    { length: 16 },
    (_, i) => ({ value: i + 1, label: `${i + 1}` }),
  );

  const rootStyle = [styles.root, layout === 'tablet' ? styles.rootTablet : styles.rootPhone];

  return (
    <View testID={`${idPrefix}-controls`} style={rootStyle}>
      {!isOnlyKeyboard && (
        <Text testID={`${idPrefix}-name`} style={styles.displayName} numberOfLines={1}>
          {name}
        </Text>
      )}

      <View style={layout === 'tablet' ? styles.rowTablet : styles.rowPhone}>
        <View style={[styles.cell, layout === 'tablet' && styles.sizeCellTablet]}>
          <Text style={styles.label}>Size</Text>
          <Dropdown
            value={currentSizeIndex}
            options={sizeOptions}
            onChange={(next) => {
              const range = BUILT_IN_KEYBOARD_SIZES[next];
              onChange({ lowKey: range.low, highKey: range.high });
            }}
            testID={`${idPrefix}-size`}
            accessibilityLabel={sizeAnchorLabel}
          />
        </View>

        {!isOnlyKeyboard && (
          <View style={styles.cell}>
            <Text style={styles.label}>Device</Text>
            <Dropdown
              value={keyboard.deviceName ?? ''}
              options={
                deviceListEmpty
                  ? [{ value: '', label: '<No input detected>' }]
                  : deviceOptions
              }
              onChange={(next) => onChange({ deviceName: next === '' ? null : next })}
              placeholder="<No input detected>"
              testID={`${idPrefix}-device`}
              accessibilityLabel={
                showDisconnectedWarning
                  ? `Device, ${keyboard.deviceName}, disconnected`
                  : 'Device'
              }
              disabled={deviceListEmpty && keyboard.deviceName == null}
              trailingIcon={
                showDisconnectedWarning ? (
                  <View testID={`${idPrefix}-device-warning`}>
                    <Ionicons name="warning" size={16} color={colors.warning} />
                  </View>
                ) : undefined
              }
            />
          </View>
        )}

        {showChannel && (
          <View style={styles.cell}>
            <Text style={styles.label}>Channel</Text>
            <Dropdown
              value={keyboard.channel ?? 0}
              options={channelOptions}
              onChange={(next) => onChange({ channel: next })}
              placeholder="—"
              testID={`${idPrefix}-channel`}
              accessibilityLabel="Channel"
            />
          </View>
        )}

        {!isOnlyKeyboard && (
          <View style={[styles.cell, styles.cellNickname]}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              testID={`${idPrefix}-nickname`}
              accessibilityLabel="Nickname"
              accessibilityHint="Optional display name for this keyboard"
              value={keyboard.nickname ?? ''}
              onChangeText={(text) => onChange({ nickname: text.length > 0 ? text : null })}
              placeholder={displayName({ ...keyboard, nickname: null }, position)}
              placeholderTextColor={colors.textSecondary}
              maxLength={32}
              multiline={false}
              style={styles.nickname}
            />
          </View>
        )}

        {!isOnlyKeyboard && (
          <Pressable
            testID={`${idPrefix}-delete`}
            accessibilityRole="button"
            accessibilityLabel="Delete Keyboard"
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  rootTablet: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rootPhone: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  rowTablet: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  rowPhone: {
    flexDirection: 'column',
    gap: 10,
  },
  cell: {
    flexShrink: 1,
    minWidth: 120,
  },
  sizeCellTablet: {
    // "88 keys (A0-C8)" is ~16 chars; give the size dropdown enough width so the
    // label never truncates against the chevron on tablet.
    minWidth: 220,
  },
  cellNickname: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 160,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  nickname: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  deleteButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  deleteButtonPressed: {
    backgroundColor: colors.menuItemPressed,
  },
});
