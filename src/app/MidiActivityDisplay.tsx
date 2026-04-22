import { StyleSheet, Text, View } from 'react-native';
import { formatMidiMessage } from '../midi/format';
import { useMidiLastMessage } from '../midi/useMidiLastMessage';
import { colors } from '../theme/colors';

/**
 * Live readout of the most recent MIDI message in the center of the Edit
 * header. Shows a neutral placeholder when no messages have been received.
 */
export function MidiActivityDisplay() {
  const last = useMidiLastMessage();
  const text = last ? formatMidiMessage(last) : 'No MIDI input';
  const idle = last === null;

  return (
    <View testID="midi-activity" style={styles.container}>
      <Text
        style={[styles.text, idle && styles.idle]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  idle: {
    color: colors.textSecondary,
  },
});
