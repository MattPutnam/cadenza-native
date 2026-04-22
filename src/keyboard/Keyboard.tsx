import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { computeKeyboardLayout, innerWidthForInnerHeight } from './layout';
import { toNoteName } from './notes';
import type { KeyboardLayoutError, KeyboardProps } from './types';
import { colors } from '../theme/colors';

const MAX_LABELED_HIGHLIGHTS = 5;
export const BORDER_WIDTH = 1;

export function Keyboard({
  low,
  high,
  highlighted,
  width: widthProp,
  height: heightProp,
  testID = 'keyboard',
  accessibilityLabel,
}: KeyboardProps) {
  const [measuredWidth, setMeasuredWidth] = useState(0);

  // Resolve the outer width in priority order:
  //   1. `height` prop — derive width from key geometry (ignore any `width` prop).
  //   2. `width` prop — use directly, skip measurement.
  //   3. fall back to the container-measured width (onLayout).
  // Subtract the border so `computeKeyboardLayout` operates on the inner box.
  let innerWidth: number;
  if (heightProp != null) {
    const innerHeight = Math.max(0, heightProp - 2 * BORDER_WIDTH);
    innerWidth = innerWidthForInnerHeight(low, high, innerHeight);
  } else if (widthProp != null) {
    innerWidth = Math.max(0, widthProp - 2 * BORDER_WIDTH);
  } else {
    innerWidth = Math.max(0, measuredWidth - 2 * BORDER_WIDTH);
  }

  const layout = useMemo(
    () => computeKeyboardLayout(low, high, innerWidth, highlighted ?? []),
    [low, high, innerWidth, highlighted],
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    // Only measure the container when we need the measurement — i.e., neither
    // `width` nor `height` was passed.
    if (heightProp != null || widthProp != null) return;
    const next = e.nativeEvent.layout.width;
    if (next !== measuredWidth) setMeasuredWidth(next);
  };

  const label = accessibilityLabel ?? generateAccessibilityLabel(low, high, highlighted ?? []);

  if (layout.error !== null) {
    if (__DEV__) {
      console.warn(
        `[Keyboard] invalid range — low=${low}, high=${high}, error=${layout.error}. ` +
          'Low and high MUST be white keys and low <= high (0..127).',
      );
    }
    return (
      <View
        testID={testID}
        accessibilityRole="image"
        accessibilityLabel={label}
        style={styles.errorRoot}
        onLayout={handleLayout}
      >
        <View testID="keyboard-error" style={styles.errorBox}>
          <Text testID="keyboard-error-message" style={styles.errorText}>
            {`Keyboard: invalid range (${describeError(layout.error)})`}
          </Text>
        </View>
      </View>
    );
  }

  // Outer dimensions: height is always derived from the layout (plus border).
  // Width is '100%' in fill-container mode; explicit pt in width/height modes.
  const outerHeight = layout.height + 2 * BORDER_WIDTH;
  const explicitWidth =
    heightProp != null
      ? innerWidth + 2 * BORDER_WIDTH
      : widthProp != null
        ? widthProp
        : undefined;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[
        styles.root,
        { height: outerHeight },
        explicitWidth != null ? { width: explicitWidth } : null,
      ]}
      onLayout={handleLayout}
    >
      {layout.keys.map((key) => {
        const isHighlighted = key.highlighted;
        const bg = isHighlighted
          ? colors.keyboardHighlight
          : key.color === 'white'
            ? colors.keyboardWhiteKey
            : colors.keyboardBlackKey;
        const highlightedBlackBorder = key.color === 'black' && isHighlighted;
        return (
          <View
            key={key.midi}
            testID={`keyboard-key-${key.midi}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: key.x,
              top: key.y,
              width: key.width,
              height: key.height,
              backgroundColor: bg,
              borderRightWidth:
                key.color === 'white' && key.midi !== high
                  ? StyleSheet.hairlineWidth
                  : highlightedBlackBorder
                    ? 1
                    : 0,
              borderRightColor: highlightedBlackBorder ? colors.keyboardBlackKey : colors.border,
              borderLeftWidth: highlightedBlackBorder ? 1 : 0,
              borderLeftColor: colors.keyboardBlackKey,
              borderBottomWidth: highlightedBlackBorder ? 1 : 0,
              borderBottomColor: colors.keyboardBlackKey,
            }}
          />
        );
      })}
    </View>
  );
}

function generateAccessibilityLabel(
  low: number,
  high: number,
  highlighted: readonly number[],
): string {
  const lowName = toNoteName(low);
  const highName = toNoteName(high);
  const inRange = Array.from(new Set(highlighted))
    .filter((m) => m >= low && m <= high)
    .sort((a, b) => a - b);
  const count = inRange.length;
  const base = `Keyboard, range ${lowName} to ${highName}, ${count} highlighted`;
  if (count === 0) return base;
  if (count <= MAX_LABELED_HIGHLIGHTS) {
    return `${base}: ${inRange.map(toNoteName).join(', ')}`;
  }
  const listed = inRange.slice(0, MAX_LABELED_HIGHLIGHTS).map(toNoteName).join(', ');
  const rest = count - MAX_LABELED_HIGHLIGHTS;
  return `${base}: ${listed}, and ${rest} more`;
}

function describeError(error: KeyboardLayoutError): string {
  switch (error) {
    case 'low-not-white-key':
      return 'low is not a white key';
    case 'high-not-white-key':
      return 'high is not a white key';
    case 'low-greater-than-high':
      return 'low is greater than high';
    case 'out-of-midi-range':
      return 'MIDI note out of 0..127';
  }
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    position: 'relative',
    borderWidth: BORDER_WIDTH,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.keyboardBlackKey,
  },
  errorRoot: {
    width: '100%',
    minHeight: 48,
  },
  errorBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.border,
    borderRadius: 8,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});
