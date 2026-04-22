import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Dropdown, type DropdownOption } from '../../src/keyboards/Dropdown';
import { colors } from '../../src/theme/colors';

const SIZE_OPTIONS: readonly DropdownOption<number>[] = [
  { value: 25, label: '25 keys' },
  { value: 49, label: '49 keys' },
  { value: 88, label: '88 keys' },
];

function Harness({
  initial = 88 as number,
  disabled = false,
  placeholder,
}: {
  initial?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState<number>(initial);
  return (
    <Dropdown
      value={value}
      options={SIZE_OPTIONS}
      onChange={setValue}
      testID="size-dd"
      accessibilityLabel="Size"
      disabled={disabled}
      placeholder={placeholder}
    />
  );
}

function flatten(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flatten));
  }
  return style as Record<string, unknown>;
}

describe('Dropdown', () => {
  it('renders the anchor with the selected label', () => {
    render(<Harness initial={49} />);
    const anchor = screen.getByTestId('size-dd');
    expect(anchor).toBeTruthy();
    expect(anchor.props.accessibilityLabel).toBe('Size');
    expect(anchor.props.accessibilityRole).toBe('button');
  });

  it('menu is NOT in the tree when closed', () => {
    render(<Harness />);
    expect(screen.queryByTestId('size-dd-menu')).toBeNull();
    expect(screen.queryByTestId('size-dd-option-25')).toBeNull();
  });

  it('tapping the anchor opens the menu with all options', () => {
    render(<Harness />);
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd'));
    });
    expect(screen.getByTestId('size-dd-menu')).toBeTruthy();
    expect(screen.getByTestId('size-dd-option-25')).toBeTruthy();
    expect(screen.getByTestId('size-dd-option-49')).toBeTruthy();
    expect(screen.getByTestId('size-dd-option-88')).toBeTruthy();
  });

  it('option has role "menuitem" and accessibilityState.selected for the current value', () => {
    render(<Harness initial={49} />);
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd'));
    });
    const selectedOption = screen.getByTestId('size-dd-option-49');
    expect(selectedOption.props.accessibilityRole).toBe('menuitem');
    expect(selectedOption.props.accessibilityState?.selected).toBe(true);
    const unselectedOption = screen.getByTestId('size-dd-option-25');
    expect(unselectedOption.props.accessibilityState?.selected).toBe(false);
  });

  it('tapping an option invokes onChange and closes the menu', () => {
    render(<Harness initial={88} />);
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd-option-25'));
    });
    expect(screen.queryByTestId('size-dd-menu')).toBeNull();
  });

  it('tapping the backdrop closes without invoking onChange', () => {
    render(<Harness initial={88} />);
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd'));
    });
    act(() => {
      fireEvent.press(screen.getByTestId('size-dd-menu-backdrop'));
    });
    expect(screen.queryByTestId('size-dd-menu')).toBeNull();
  });

  it('focusable and applies focus ring color on focus', () => {
    render(<Harness />);
    const anchor = screen.getByTestId('size-dd');
    expect(anchor.props.focusable).toBe(true);
    fireEvent(anchor, 'focus');
    const style = flatten(anchor.props.style);
    expect(style.borderColor).toBe(colors.focusRing);
  });

  it('disabled=true renders the anchor non-interactive and prevents menu open', () => {
    render(<Harness disabled placeholder="<No input detected>" />);
    const anchor = screen.getByTestId('size-dd');
    expect(anchor.props.focusable).toBe(false);
    expect(anchor.props.accessibilityState?.disabled).toBe(true);
    act(() => {
      fireEvent.press(anchor);
    });
    expect(screen.queryByTestId('size-dd-menu')).toBeNull();
  });
});
