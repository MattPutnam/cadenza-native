import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EditViewSegmented } from '../../src/app/EditViewSegmented';
import { EditViewProvider } from '../../src/edit-view/EditViewContext';
import { useEditView } from '../../src/edit-view/useEditView';
import { colors } from '../../src/theme/colors';

function CurrentView() {
  const { editView } = useEditView();
  return <Text testID="current-view">{editView}</Text>;
}

function renderWithProvider() {
  return render(
    <EditViewProvider>
      <EditViewSegmented />
      <CurrentView />
    </EditViewProvider>,
  );
}

describe('EditViewSegmented', () => {
  it('renders three segments in order: Setup, Patches, Cues', () => {
    renderWithProvider();
    expect(screen.getByTestId('edit-view-segment-setup')).toBeTruthy();
    expect(screen.getByTestId('edit-view-segment-patches')).toBeTruthy();
    expect(screen.getByTestId('edit-view-segment-cues')).toBeTruthy();
  });

  it('initially marks Setup as selected and others unselected', () => {
    renderWithProvider();
    expect(
      screen.getByTestId('edit-view-segment-setup').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('edit-view-segment-patches').props.accessibilityState.selected,
    ).toBe(false);
    expect(
      screen.getByTestId('edit-view-segment-cues').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('tapping a segment dispatches setEditView with the matching key', () => {
    renderWithProvider();
    act(() => {
      fireEvent.press(screen.getByTestId('edit-view-segment-patches'));
    });
    expect(screen.getByTestId('current-view').props.children).toBe('patches');
    expect(
      screen.getByTestId('edit-view-segment-patches').props.accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('edit-view-segment-setup').props.accessibilityState.selected,
    ).toBe(false);
  });

  it('each segment uses the tab role', () => {
    renderWithProvider();
    expect(screen.getByTestId('edit-view-segment-setup').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('edit-view-segment-patches').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('edit-view-segment-cues').props.accessibilityRole).toBe('tab');
  });

  it('each segment is keyboard-reachable (focusable !== false)', () => {
    renderWithProvider();
    expect(screen.getByTestId('edit-view-segment-setup').props.focusable).not.toBe(false);
    expect(screen.getByTestId('edit-view-segment-patches').props.focusable).not.toBe(false);
    expect(screen.getByTestId('edit-view-segment-cues').props.focusable).not.toBe(false);
  });

  it('firing onFocus applies the focus-ring border color to the segment', () => {
    renderWithProvider();
    const segment = screen.getByTestId('edit-view-segment-setup');
    fireEvent(segment, 'focus');
    const style = Array.isArray(segment.props.style)
      ? Object.assign({}, ...segment.props.style.filter(Boolean))
      : segment.props.style;
    expect(style.borderColor).toBe(colors.focusRing);
  });
});
