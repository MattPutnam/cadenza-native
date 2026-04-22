import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EditViewDropdown } from '../../src/app/EditViewDropdown';
import { EditViewProvider } from '../../src/edit-view/EditViewContext';
import { useEditView } from '../../src/edit-view/useEditView';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { colors } from '../../src/theme/colors';

function Probes() {
  const { editView } = useEditView();
  const { mode } = useMode();
  return (
    <>
      <Text testID="probe-view">{editView}</Text>
      <Text testID="probe-mode">{mode}</Text>
    </>
  );
}

function renderWithProviders() {
  return render(
    <ModeProvider>
      <EditViewProvider>
        <EditViewDropdown />
        <Probes />
      </EditViewProvider>
    </ModeProvider>,
  );
}

function openMenu() {
  act(() => {
    fireEvent.press(screen.getByTestId('edit-view-dropdown-button'));
  });
}

describe('EditViewDropdown', () => {
  it('renders a "View" anchor button labeled "View"', () => {
    renderWithProviders();
    const anchor = screen.getByTestId('edit-view-dropdown-button');
    expect(anchor).toBeTruthy();
    expect(anchor.props.accessibilityLabel).toBe('View');
    expect(anchor.props.accessibilityRole).toBe('button');
  });

  it('anchor button is keyboard-reachable (focusable !== false)', () => {
    renderWithProviders();
    const anchor = screen.getByTestId('edit-view-dropdown-button');
    expect(anchor.props.focusable).not.toBe(false);
  });

  it('anchor focus applies the focus-ring border color', () => {
    renderWithProviders();
    const anchor = screen.getByTestId('edit-view-dropdown-button');
    fireEvent(anchor, 'focus');
    const style = Array.isArray(anchor.props.style)
      ? Object.assign({}, ...anchor.props.style.filter(Boolean))
      : anchor.props.style;
    expect(style.borderColor).toBe(colors.focusRing);
  });

  it('menu is not in the tree when closed', () => {
    renderWithProviders();
    expect(screen.queryByTestId('edit-view-dropdown-menu')).toBeNull();
    expect(screen.queryByTestId('edit-view-menu-setup')).toBeNull();
  });

  it('tapping the anchor opens the menu with four items in order', () => {
    renderWithProviders();
    openMenu();
    expect(screen.getByTestId('edit-view-dropdown-menu')).toBeTruthy();
    expect(screen.getByTestId('edit-view-menu-setup')).toBeTruthy();
    expect(screen.getByTestId('edit-view-menu-patches')).toBeTruthy();
    expect(screen.getByTestId('edit-view-menu-cues')).toBeTruthy();
    expect(screen.getByTestId('edit-view-menu-perform')).toBeTruthy();
  });

  it('tapping Patches dispatches setEditView and closes the menu', () => {
    renderWithProviders();
    openMenu();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-menu-patches'));
    });
    expect(screen.getByTestId('probe-view').props.children).toBe('patches');
    expect(screen.queryByTestId('edit-view-dropdown-menu')).toBeNull();
  });

  it('tapping Cues dispatches setEditView', () => {
    renderWithProviders();
    openMenu();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-menu-cues'));
    });
    expect(screen.getByTestId('probe-view').props.children).toBe('cues');
  });

  it('tapping Perform switches app mode and does NOT change editView', () => {
    renderWithProviders();
    // First move editView to patches so we can verify Perform doesn't reset it.
    openMenu();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-menu-patches'));
    });
    expect(screen.getByTestId('probe-view').props.children).toBe('patches');
    openMenu();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-menu-perform'));
    });
    expect(screen.getByTestId('probe-mode').props.children).toBe('perform');
    expect(screen.getByTestId('probe-view').props.children).toBe('patches');
    expect(screen.queryByTestId('edit-view-dropdown-menu')).toBeNull();
  });

  it('tapping the backdrop closes the menu with no state change', () => {
    renderWithProviders();
    openMenu();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-menu-backdrop'));
    });
    expect(screen.queryByTestId('edit-view-dropdown-menu')).toBeNull();
    expect(screen.getByTestId('probe-view').props.children).toBe('setup');
    expect(screen.getByTestId('probe-mode').props.children).toBe('edit');
  });

  it('onRequestClose on the Modal closes the menu (Android back)', () => {
    renderWithProviders();
    openMenu();
    const modal = screen.getByTestId('edit-view-dropdown-modal');
    const onRequestClose = modal.props.onRequestClose;
    expect(typeof onRequestClose).toBe('function');
    act(() => {
      onRequestClose?.();
    });
    expect(screen.queryByTestId('edit-view-dropdown-menu')).toBeNull();
    expect(screen.getByTestId('probe-view').props.children).toBe('setup');
    expect(screen.getByTestId('probe-mode').props.children).toBe('edit');
  });

  it('selected state tracks the active sub-view; Perform has no selected state', () => {
    renderWithProviders();
    openMenu();
    // Initially Setup is active.
    expect(
      screen.getByTestId('edit-view-menu-setup').props.accessibilityState?.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('edit-view-menu-patches').props.accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('edit-view-menu-cues').props.accessibilityState?.selected,
    ).toBe(false);
    // Perform has no `selected` state (it is not a sub-view choice).
    const performState = screen.getByTestId('edit-view-menu-perform').props.accessibilityState;
    expect(performState?.selected).toBeFalsy();
  });

  it('every menu item is keyboard-reachable (focusable !== false)', () => {
    renderWithProviders();
    openMenu();
    expect(screen.getByTestId('edit-view-menu-setup').props.focusable).not.toBe(false);
    expect(screen.getByTestId('edit-view-menu-patches').props.focusable).not.toBe(false);
    expect(screen.getByTestId('edit-view-menu-cues').props.focusable).not.toBe(false);
    expect(screen.getByTestId('edit-view-menu-perform').props.focusable).not.toBe(false);
  });

  it('firing onFocus on a menu item applies the focus-ring border color', () => {
    renderWithProviders();
    openMenu();
    const item = screen.getByTestId('edit-view-menu-setup');
    fireEvent(item, 'focus');
    // Pressable style may be a function; invoke it with a non-pressed interaction state.
    const rawStyle = item.props.style;
    const resolved = typeof rawStyle === 'function' ? rawStyle({ pressed: false }) : rawStyle;
    const flattened = Array.isArray(resolved)
      ? Object.assign({}, ...resolved.filter(Boolean))
      : resolved;
    expect(flattened.borderColor).toBe(colors.focusRing);
  });
});
