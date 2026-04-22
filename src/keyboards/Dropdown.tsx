import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export interface DropdownOption<T> {
  readonly value: T;
  readonly label: string;
  readonly trailingIcon?: ReactNode;
  readonly testID?: string;
}

export interface DropdownProps<T> {
  readonly value: T;
  readonly options: readonly DropdownOption<T>[];
  readonly onChange: (next: T) => void;
  readonly placeholder?: string;
  readonly testID?: string;
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly trailingIcon?: ReactNode;
}

export function Dropdown<T>({
  value,
  options,
  onChange,
  placeholder,
  testID,
  accessibilityLabel,
  disabled = false,
  trailingIcon,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [anchorFocused, setAnchorFocused] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const handleSelect = useCallback(
    (next: T) => {
      onChange(next);
      close();
    },
    [onChange, close],
  );

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder ?? '';

  return (
    <>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        focusable={!disabled}
        onPress={handleOpen}
        onFocus={() => setAnchorFocused(true)}
        onBlur={() => setAnchorFocused(false)}
        hitSlop={6}
        style={[
          styles.anchor,
          disabled && styles.anchorDisabled,
          anchorFocused && styles.anchorFocused,
        ]}
      >
        <Text
          style={[styles.anchorLabel, disabled && styles.anchorLabelDisabled]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View style={styles.anchorTrailing}>
          {trailingIcon ?? (
            !disabled && (
              <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
            )
          )}
        </View>
      </Pressable>

      {open && !disabled && (
        <Modal
          visible
          transparent
          animationType="fade"
          supportedOrientations={[
            'portrait',
            'portrait-upside-down',
            'landscape-left',
            'landscape-right',
          ]}
          onRequestClose={close}
        >
          <Pressable
            testID={testID ? `${testID}-menu-backdrop` : undefined}
            style={styles.backdrop}
            onPress={close}
          />
          <View
            testID={testID ? `${testID}-menu` : undefined}
            accessibilityRole="menu"
            style={styles.menu}
          >
            {options.map((option) => (
              <DropdownItem
                key={String(option.value)}
                option={option}
                selected={option.value === value}
                testID={option.testID ?? (testID ? `${testID}-option-${String(option.value)}` : undefined)}
                onSelect={() => handleSelect(option.value)}
              />
            ))}
          </View>
        </Modal>
      )}
    </>
  );
}

interface DropdownItemProps<T> {
  readonly option: DropdownOption<T>;
  readonly selected: boolean;
  readonly testID?: string;
  readonly onSelect: () => void;
}

function DropdownItem<T>({ option, selected, testID, onSelect }: DropdownItemProps<T>) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="menuitem"
      accessibilityLabel={option.label}
      accessibilityState={{ selected }}
      focusable
      onPress={onSelect}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        focused && styles.itemFocused,
      ]}
    >
      <Text style={styles.itemLabel} numberOfLines={1}>
        {option.label}
      </Text>
      <View style={styles.itemTrailing}>
        {option.trailingIcon}
        {selected && (
          <Ionicons name="checkmark" size={16} color={colors.textPrimary} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  anchor: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  anchorDisabled: {
    opacity: 0.55,
  },
  anchorFocused: {
    borderColor: colors.focusRing,
  },
  anchorLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  anchorLabelDisabled: {
    color: colors.textSecondary,
  },
  anchorTrailing: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    borderRadius: 10,
    backgroundColor: colors.menuSurface,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemPressed: {
    backgroundColor: colors.menuItemPressed,
  },
  itemFocused: {
    borderColor: colors.focusRing,
  },
  itemLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  itemTrailing: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
