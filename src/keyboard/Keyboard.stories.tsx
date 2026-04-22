import type { Meta, StoryObj } from '@storybook/react';
import { View } from 'react-native';
import { Keyboard } from './Keyboard';

const meta: Meta<typeof Keyboard> = {
  title: 'Components/Keyboard',
  component: Keyboard,
  decorators: [
    (Story) => (
      <View style={{ padding: 16, justifyContent: 'center', flex: 1 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Keyboard>;

/** Full 88-key piano: A0 (MIDI 21) through C8 (MIDI 108). */
export const FullPiano: Story = {
  name: 'Full 88-key piano',
  args: { low: 21, high: 108, highlighted: [] },
};

/** A two-octave range with Middle C highlighted. */
export const MiddleCHighlighted: Story = {
  name: 'Middle C highlighted',
  args: { low: 48, high: 72, highlighted: [60] },
};

/** A C major chord (C4 + E4 + G4) highlighted. */
export const CMajorChord: Story = {
  name: 'C major chord',
  args: { low: 48, high: 72, highlighted: [60, 64, 67] },
};

/** Five contiguous chromatic notes, mixing white and black keys. */
export const ChromaticSelection: Story = {
  name: 'Chromatic selection',
  args: { low: 48, high: 72, highlighted: [60, 61, 62, 63, 64] },
};

/** Baseline: two-octave range with no highlights. */
export const EmptyHighlights: Story = {
  name: 'Empty highlights',
  args: { low: 48, high: 72, highlighted: [] },
};

/** A single octave (C4..C5) with root and octave highlighted. */
export const OneOctaveRange: Story = {
  name: 'One octave (root + octave)',
  args: { low: 60, high: 72, highlighted: [60, 72] },
};

/** A narrow 320-pt wrapper to verify fill-to-width at small sizes. */
export const NarrowContainer: Story = {
  name: 'Narrow container (320 pt)',
  args: { low: 48, high: 72, highlighted: [60, 64, 67] },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, justifyContent: 'center', flex: 1 }}>
        <View style={{ width: 320 }}>
          <Story />
        </View>
      </View>
    ),
  ],
};

/** A wide 1000-pt wrapper to verify fill-to-width at large sizes. */
export const WideContainer: Story = {
  name: 'Wide container (1000 pt)',
  args: { low: 48, high: 72, highlighted: [60, 64, 67] },
  decorators: [
    (Story) => (
      <View style={{ padding: 16, justifyContent: 'center', flex: 1 }}>
        <View style={{ width: 1000 }}>
          <Story />
        </View>
      </View>
    ),
  ],
};
