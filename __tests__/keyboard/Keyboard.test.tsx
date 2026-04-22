import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from '../../src/keyboard/Keyboard';
import { colors } from '../../src/theme/colors';

function layoutRoot(width: number) {
  const root = screen.getByTestId('keyboard');
  fireEvent(root, 'layout', { nativeEvent: { layout: { width, height: 0, x: 0, y: 0 } } });
}

describe('Keyboard component', () => {
  it('uses default testID "keyboard" on the root View', () => {
    render(<Keyboard low={48} high={72} />);
    expect(screen.getByTestId('keyboard')).toBeTruthy();
  });

  it('accepts a caller-supplied testID override', () => {
    render(<Keyboard low={48} high={72} testID="custom-keyboard" />);
    expect(screen.getByTestId('custom-keyboard')).toBeTruthy();
    expect(screen.queryByTestId('keyboard')).toBeNull();
  });

  it('root has accessibilityRole="image" and generated accessibilityLabel', () => {
    render(<Keyboard low={48} high={72} />);
    const root = screen.getByTestId('keyboard');
    expect(root.props.accessibilityRole).toBe('image');
    expect(root.props.accessibilityLabel).toBe('Keyboard, range C3 to C5, 0 highlighted');
  });

  it('generates accessibilityLabel that lists up to 5 highlighted notes', () => {
    render(<Keyboard low={48} high={72} highlighted={[60, 64, 67]} />);
    expect(screen.getByTestId('keyboard').props.accessibilityLabel).toBe(
      'Keyboard, range C3 to C5, 3 highlighted: C4, E4, G4',
    );
  });

  it('truncates a long highlight list in the accessibilityLabel with "and N more"', () => {
    const allNotes = Array.from({ length: 25 }, (_, i) => 48 + i);
    render(<Keyboard low={48} high={72} highlighted={allNotes} />);
    const label = screen.getByTestId('keyboard').props.accessibilityLabel as string;
    expect(label.startsWith('Keyboard, range C3 to C5, 25 highlighted: C3')).toBe(true);
    expect(label).toContain('and 20 more');
  });

  it('caller-supplied accessibilityLabel overrides the generator', () => {
    render(<Keyboard low={48} high={72} accessibilityLabel="Custom label" />);
    expect(screen.getByTestId('keyboard').props.accessibilityLabel).toBe('Custom label');
  });

  it('renders 25 key testIDs for range 48..72 after onLayout fires with width=700', () => {
    render(<Keyboard low={48} high={72} />);
    layoutRoot(700);
    // 15 white + 10 black = 25
    for (let midi = 48; midi <= 72; midi++) {
      expect(screen.getByTestId(`keyboard-key-${midi}`)).toBeTruthy();
    }
  });

  it('highlights only in-range notes with keyboardHighlight background', () => {
    render(<Keyboard low={48} high={72} highlighted={[60]} />);
    layoutRoot(700);

    const c4 = screen.getByTestId('keyboard-key-60');
    const e4 = screen.getByTestId('keyboard-key-64');

    const c4Style = flattenStyle(c4.props.style);
    const e4Style = flattenStyle(e4.props.style);

    expect(c4Style.backgroundColor).toBe(colors.keyboardHighlight);
    expect(e4Style.backgroundColor).toBe(colors.keyboardWhiteKey);
  });

  it('silently ignores out-of-range highlights (highlighted=[200])', () => {
    render(<Keyboard low={48} high={72} highlighted={[200]} />);
    layoutRoot(700);
    // No rendered key should use the highlight color.
    for (let midi = 48; midi <= 72; midi++) {
      const node = screen.getByTestId(`keyboard-key-${midi}`);
      const style = flattenStyle(node.props.style);
      expect(style.backgroundColor).not.toBe(colors.keyboardHighlight);
    }
  });

  it('renders keyboard-error and suppresses key rendering when low is a black key (low=61)', () => {
    render(<Keyboard low={61} high={72} />);
    layoutRoot(700);
    expect(screen.getByTestId('keyboard-error')).toBeTruthy();
    const msg = screen.getByTestId('keyboard-error-message').props.children as string;
    expect(typeof msg).toBe('string');
    expect(msg.startsWith('Keyboard: invalid range')).toBe(true);
    // No key testIDs should be in the tree.
    expect(screen.queryByTestId('keyboard-key-72')).toBeNull();
  });

  it('renders keyboard-error when high is a black key (high=70)', () => {
    render(<Keyboard low={48} high={70} />);
    expect(screen.getByTestId('keyboard-error')).toBeTruthy();
  });

  it('no rendered key has an onPress prop (display-only)', () => {
    render(<Keyboard low={48} high={72} highlighted={[60]} />);
    layoutRoot(700);
    for (let midi = 48; midi <= 72; midi++) {
      const node = screen.getByTestId(`keyboard-key-${midi}`);
      expect(node.props.onPress).toBeUndefined();
      expect(node.props.pointerEvents).toBe('none');
    }
  });

  it('re-renders when container width changes (SC-002 / FR-011)', () => {
    render(<Keyboard low={48} high={72} />);
    layoutRoot(700);
    const first = flattenStyle(screen.getByTestId('keyboard-key-60').props.style);
    const firstWidth = Number(first.width);
    // Keyboard has a 1 pt border on each side, so the inner content width is
    // (outer width - 2 * 1).
    expect(firstWidth).toBeCloseTo((700 - 2) / 15, 6);

    layoutRoot(450);
    const second = flattenStyle(screen.getByTestId('keyboard-key-60').props.style);
    const secondWidth = Number(second.width);
    expect(secondWidth).toBeCloseTo((450 - 2) / 15, 6);
    expect(secondWidth).not.toBeCloseTo(firstWidth, 6);
  });

  it('re-renders when the highlighted prop changes (FR-011)', () => {
    const { rerender } = render(<Keyboard low={48} high={72} highlighted={[]} />);
    layoutRoot(700);
    expect(flattenStyle(screen.getByTestId('keyboard-key-60').props.style).backgroundColor).toBe(
      colors.keyboardWhiteKey,
    );
    rerender(<Keyboard low={48} high={72} highlighted={[60]} />);
    // rerender does not re-fire layout; the width state is preserved.
    expect(flattenStyle(screen.getByTestId('keyboard-key-60').props.style).backgroundColor).toBe(
      colors.keyboardHighlight,
    );
  });

  it('uses keyboardBlackKey color for black keys (e.g., C#4 / midi 61)', () => {
    render(<Keyboard low={48} high={72} />);
    layoutRoot(700);
    const csharp4 = screen.getByTestId('keyboard-key-61');
    expect(flattenStyle(csharp4.props.style).backgroundColor).toBe(colors.keyboardBlackKey);
  });
});

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
  }
  return style as Record<string, unknown>;
}
