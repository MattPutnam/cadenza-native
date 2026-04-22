import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EDIT_VIEWS, EDIT_VIEW_LABELS, type EditView } from '../edit-view/EditViewContext';
import { useEditView } from '../edit-view/useEditView';
import { colors } from '../theme/colors';

export function EditViewSegmented() {
  const { editView, setEditView } = useEditView();

  return (
    <View testID="edit-view-segmented" accessibilityRole="tablist" style={styles.track}>
      {EDIT_VIEWS.map((key) => (
        <Segment
          key={key}
          segmentKey={key}
          isActive={editView === key}
          onPress={() => setEditView(key)}
        />
      ))}
    </View>
  );
}

interface SegmentProps {
  segmentKey: EditView;
  isActive: boolean;
  onPress: () => void;
}

function Segment({ segmentKey, isActive, onPress }: SegmentProps) {
  const [focused, setFocused] = useState(false);
  const label = EDIT_VIEW_LABELS[segmentKey];

  return (
    <Pressable
      testID={`edit-view-segment-${segmentKey}`}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      focusable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.segment,
        isActive ? styles.segmentActive : styles.segmentInactive,
        focused && styles.segmentFocused,
      ]}
    >
      <Text
        style={[
          styles.label,
          isActive ? styles.labelActive : styles.labelInactive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.segmentedTrack,
    borderRadius: 10,
    padding: 2,
    marginLeft: 16,
  },
  segment: {
    minWidth: 88,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    // Transparent baseline border so applying focus ring doesn't shift layout.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: colors.segmentedSelected,
  },
  segmentInactive: {
    backgroundColor: 'transparent',
  },
  segmentFocused: {
    borderColor: colors.focusRing,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.segmentedLabelSelected,
  },
  labelInactive: {
    color: colors.segmentedLabel,
  },
});
