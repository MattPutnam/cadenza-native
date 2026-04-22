import { useLayoutMode } from '../layout/useLayoutMode';
import { EditViewDropdown } from './EditViewDropdown';
import { EditViewSegmented } from './EditViewSegmented';

/**
 * Picks the Edit-mode header view-switcher variant based on the current window
 * width. Tablet layouts (≥ 600 dp) get the segmented control; phone layouts
 * get the View dropdown.
 */
export function EditViewHeaderControl() {
  const mode = useLayoutMode();
  if (mode === 'tablet') {
    return <EditViewSegmented />;
  }
  return <EditViewDropdown />;
}
