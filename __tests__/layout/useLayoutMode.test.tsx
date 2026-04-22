import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useLayoutMode } from '../../src/layout/useLayoutMode';

const mockUseWindowDimensions = jest.fn();

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockUseWindowDimensions(),
}));

function Probe() {
  const mode = useLayoutMode();
  return <Text testID="layout-mode">{mode}</Text>;
}

describe('useLayoutMode', () => {
  beforeEach(() => {
    mockUseWindowDimensions.mockReset();
  });

  it('returns "phone" when width is 599', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 599, height: 800, scale: 2, fontScale: 1 });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('phone');
  });

  it('returns "tablet" when width equals TABLET_MIN_WIDTH (600)', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 600, height: 800, scale: 2, fontScale: 1 });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('tablet');
  });

  it('returns "tablet" for large widths (9999)', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 9999, height: 800, scale: 2, fontScale: 1 });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('tablet');
  });

  it('returns "phone" for very narrow widths (320)', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 320, height: 568, scale: 2, fontScale: 1 });
    const { getByTestId } = render(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('phone');
  });

  it('re-evaluates when useWindowDimensions width changes', () => {
    mockUseWindowDimensions.mockReturnValue({ width: 400, height: 800, scale: 2, fontScale: 1 });
    const { getByTestId, rerender } = render(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('phone');
    mockUseWindowDimensions.mockReturnValue({ width: 900, height: 800, scale: 2, fontScale: 1 });
    rerender(<Probe />);
    expect(getByTestId('layout-mode').props.children).toBe('tablet');
  });
});
