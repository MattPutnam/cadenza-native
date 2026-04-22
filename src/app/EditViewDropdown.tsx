import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import {
  EDIT_VIEWS,
  EDIT_VIEW_LABELS,
  type EditView,
} from '../edit-view/EditViewContext';
import { useEditView } from '../edit-view/useEditView';
import { useMode } from '../mode/useMode';
import { colors } from '../theme/colors';

type MenuKey = EditView | 'perform';

const MENU_ORDER: readonly MenuKey[] = ['setup', 'patches', 'cues', 'perform'] as const;
const MENU_LABELS: Record<MenuKey, string> = {
  ...EDIT_VIEW_LABELS,
  perform: 'Perform',
};

/**
 * Phone-layout Edit-mode view control. Replaces the standalone Perform button
 * on phone widths. Tapping it opens a dropdown with Setup / Patches / Cues /
 * Perform — selecting Setup/Patches/Cues changes the Edit sub-view; selecting
 * Perform switches app mode.
 *
 * Rotation while the menu is open is not required to persist the menu; the
 * Modal may close on orientation change. Users can reopen if needed.
 */
export function EditViewDropdown() {
  const { editView, setEditView } = useEditView();
  const { setMode } = useMode();
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<LayoutRectangle | null>(null);
  const [anchorFocused, setAnchorFocused] = useState(false);
  const anchorRef = useRef<View>(null);

  const close = useCallback(() => setOpen(false), []);

  const handleOpen = useCallback(() => {
    // Open synchronously so the menu renders even if the native measurement
    // API does not invoke its callback (e.g. in Jest test renderer). Position
    // is then refined once the anchor's window coordinates are available.
    setOpen(true);
    anchorRef.current?.measureInWindow?.((x, y, width, height) => {
      setAnchorRect({ x, y, width, height });
    });
  }, []);

  const handleSelect = useCallback(
    (key: MenuKey) => {
      if (key === 'perform') {
        setMode('perform');
      } else {
        setEditView(key);
      }
      close();
    },
    [setEditView, setMode, close],
  );

  const menuTop = anchorRect ? anchorRect.y + anchorRect.height + 4 : 0;
  const menuLeft = anchorRect ? anchorRect.x : 0;

  return (
    <>
      <Pressable
        ref={anchorRef}
        testID="edit-view-dropdown-button"
        accessibilityRole="button"
        accessibilityLabel="View"
        accessibilityHint="Opens view menu"
        focusable
        onPress={handleOpen}
        onFocus={() => setAnchorFocused(true)}
        onBlur={() => setAnchorFocused(false)}
        hitSlop={8}
        style={[styles.anchor, anchorFocused && styles.anchorFocused]}
      >
        <Text style={styles.anchorLabel}>View</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textPrimary} style={styles.chevron} />
      </Pressable>

      <Modal
        testID="edit-view-dropdown-modal"
        visible={open}
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
          testID="edit-view-menu-backdrop"
          style={styles.backdrop}
          onPress={close}
        />
        <View
          testID="edit-view-dropdown-menu"
          accessibilityRole="menu"
          style={[styles.menu, { top: menuTop, left: menuLeft }]}
        >
          {MENU_ORDER.map((key, index) => (
            <MenuItem
              key={key}
              menuKey={key}
              label={MENU_LABELS[key]}
              isActive={key !== 'perform' && key === editView}
              onSelect={handleSelect}
              showTopDivider={index > 0}
            />
          ))}
        </View>
      </Modal>
    </>
  );
}

interface MenuItemProps {
  menuKey: MenuKey;
  label: string;
  isActive: boolean;
  onSelect: (key: MenuKey) => void;
  showTopDivider: boolean;
}

function MenuItem({ menuKey, label, isActive, onSelect, showTopDivider }: MenuItemProps) {
  const [focused, setFocused] = useState(false);
  const isEditSubView = menuKey !== 'perform';

  return (
    <Pressable
      testID={`edit-view-menu-${menuKey}`}
      accessibilityRole="menuitem"
      accessibilityLabel={label}
      accessibilityState={isEditSubView ? { selected: isActive } : undefined}
      focusable
      onPress={() => onSelect(menuKey)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.item,
        showTopDivider && styles.itemDivider,
        pressed && styles.itemPressed,
        focused && styles.itemFocused,
      ]}
    >
      <View style={styles.checkSlot}>
        {isActive && (
          <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
        )}
      </View>
      <Text style={styles.itemLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  anchor: {
    minWidth: 104,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent baseline border so focus ring doesn't shift layout.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  anchorFocused: {
    borderColor: colors.focusRing,
  },
  anchorLabel: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chevron: {
    marginLeft: 6,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: 'absolute',
    minWidth: 200,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 6,
    marginHorizontal: 4,
  },
  itemDivider: {
    borderTopColor: colors.menuDivider,
  },
  itemPressed: {
    backgroundColor: colors.menuItemPressed,
  },
  itemFocused: {
    borderColor: colors.focusRing,
  },
  checkSlot: {
    width: 26,
    alignItems: 'center',
  },
  itemLabel: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
