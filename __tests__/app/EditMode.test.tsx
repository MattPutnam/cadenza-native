import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { EditMode } from '../../src/app/EditMode';
import { ModeProvider } from '../../src/mode/ModeContext';
import { useMode } from '../../src/mode/useMode';
import { colors } from '../../src/theme/colors';

function ModeProbe() {
  const { mode } = useMode();
  return <Text testID="probed-mode">{mode}</Text>;
}

function ResetToEdit() {
  const { setMode } = useMode();
  return (
    <Pressable testID="reset-to-edit" onPress={() => setMode('edit')}>
      <View />
    </Pressable>
  );
}

describe('EditMode', () => {
  it('renders a header landmark at the top containing the "Perform" button', () => {
    render(
      <ModeProvider>
        <EditMode />
      </ModeProvider>,
    );
    const header = screen.getByTestId('edit-header');
    expect(header).toBeTruthy();
    const perform = screen.getByRole('button', { name: 'Perform' });
    expect(perform).toBeTruthy();
  });

  it('activating the "Perform" button flips app mode to "perform"', () => {
    render(
      <ModeProvider>
        <EditMode />
        <ModeProbe />
      </ModeProvider>,
    );
    expect(screen.getByTestId('probed-mode').props.children).toBe('edit');
    act(() => {
      fireEvent.press(screen.getByRole('button', { name: 'Perform' }));
    });
    expect(screen.getByTestId('probed-mode').props.children).toBe('perform');
  });

  it('header background is the elevated surface token from the dark theme', () => {
    render(
      <ModeProvider>
        <EditMode />
      </ModeProvider>,
    );
    const header = screen.getByTestId('edit-header');
    const flattened = Array.isArray(header.props.style)
      ? Object.assign({}, ...header.props.style)
      : header.props.style;
    expect(flattened.backgroundColor).toBe(colors.surfaceElevated);
  });
});
