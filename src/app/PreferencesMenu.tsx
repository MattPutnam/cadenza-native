import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PREFERENCES_SCHEMA, type PreferenceKey, type Preferences } from '../prefs/schema';
import { usePreferences } from '../prefs/usePreferences';
import { colors } from '../theme/colors';

export interface PreferencesMenuProps {
  visible: boolean;
  onClose: () => void;
}

const PREFERENCE_KEYS = Object.keys(PREFERENCES_SCHEMA) as PreferenceKey[];

export function PreferencesMenu({ visible, onClose }: PreferencesMenuProps) {
  const { prefs, setPreference } = usePreferences();

  return (
    <Modal
      testID="prefs-overlay"
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <PreferencesMenuContent prefs={prefs} setPreference={setPreference} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

interface PreferencesMenuContentProps {
  prefs: Preferences;
  setPreference: <K extends PreferenceKey>(key: K, value: Preferences[K]) => void;
  onClose: () => void;
}

function PreferencesMenuContent({ prefs, setPreference, onClose }: PreferencesMenuContentProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          accessible
          accessibilityRole="button"
          accessibilityLabel="Close Preferences"
          focusable
          onPress={onClose}
          hitSlop={12}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text testID="prefs-title" style={styles.title}>
          Preferences
        </Text>
        <View style={styles.topBarSpacer} />
      </View>
      <View style={styles.list}>
        {PREFERENCE_KEYS.map((key) => (
          <PreferenceRow
            key={key}
            prefKey={key}
            value={prefs[key] as boolean}
            onToggle={(next) => setPreference(key, next as Preferences[typeof key])}
          />
        ))}
      </View>
    </View>
  );
}

interface PreferenceRowProps {
  prefKey: PreferenceKey;
  value: boolean;
  onToggle: (next: boolean) => void;
}

function PreferenceRow({ prefKey, value, onToggle }: PreferenceRowProps) {
  const schema = PREFERENCES_SCHEMA[prefKey];
  const { label } = schema;
  return (
    <Pressable
      testID={`prefs-row-${prefKey}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onToggle(!value)}
      style={styles.row}
    >
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowState}>{value ? 'On' : 'Off'}</Text>
      </View>
      <Switch
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
        value={value}
        onValueChange={onToggle}
        trackColor={{ true: colors.switchTrackOn, false: colors.switchTrackOff }}
        thumbColor={value ? colors.switchThumbOn : colors.switchThumbOff}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.modalSurface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  topBarSpacer: {
    width: 44,
  },
  list: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  rowLabelWrap: {
    flex: 1,
  },
  rowLabel: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  rowState: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
});
