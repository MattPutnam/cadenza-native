import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import { EditViewProvider } from '../../src/edit-view/EditViewContext';
import { useEditView } from '../../src/edit-view/useEditView';

function Probe() {
  const { editView, setEditView } = useEditView();
  return (
    <View>
      <Text testID="current-view">{editView}</Text>
      <Pressable testID="to-patches" onPress={() => setEditView('patches')}>
        <Text>patches</Text>
      </Pressable>
      <Pressable testID="to-cues" onPress={() => setEditView('cues')}>
        <Text>cues</Text>
      </Pressable>
      <Pressable testID="to-setup" onPress={() => setEditView('setup')}>
        <Text>setup</Text>
      </Pressable>
    </View>
  );
}

describe('EditViewContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('default editView is "setup" under an EditViewProvider', () => {
    render(
      <EditViewProvider>
        <Probe />
      </EditViewProvider>,
    );
    expect(screen.getByTestId('current-view').props.children).toBe('setup');
  });

  it('setEditView flips the value and consumers see it on next render', () => {
    render(
      <EditViewProvider>
        <Probe />
      </EditViewProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('to-patches'));
    });
    expect(screen.getByTestId('current-view').props.children).toBe('patches');
    act(() => {
      fireEvent.press(screen.getByTestId('to-cues'));
    });
    expect(screen.getByTestId('current-view').props.children).toBe('cues');
  });

  it('setEditView identity is stable across re-renders when value is unchanged', () => {
    let seenSetters: Array<(next: 'setup' | 'patches' | 'cues') => void> = [];
    function Capture() {
      const { setEditView } = useEditView();
      seenSetters.push(setEditView);
      return null;
    }
    const { rerender } = render(
      <EditViewProvider>
        <Capture />
      </EditViewProvider>,
    );
    rerender(
      <EditViewProvider>
        <Capture />
      </EditViewProvider>,
    );
    // Provider re-renders do not change setEditView identity.
    expect(seenSetters[0]).toBe(seenSetters[1]);
  });

  it('does not read or write AsyncStorage during mount or update', async () => {
    const getItemSpy = jest.spyOn(AsyncStorage, 'getItem');
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem');
    render(
      <EditViewProvider>
        <Probe />
      </EditViewProvider>,
    );
    act(() => {
      fireEvent.press(screen.getByTestId('to-patches'));
    });
    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('useEditView() outside an EditViewProvider throws a developer-facing error', () => {
    const originalError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/EditViewProvider/);
    } finally {
      console.error = originalError;
    }
  });
});
