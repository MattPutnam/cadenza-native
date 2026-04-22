import { EditViewProvider } from '../edit-view/EditViewContext';
import { useMode } from '../mode/useMode';
import { EditMode } from './EditMode';
import { PerformMode } from './PerformMode';

export function Shell() {
  const { mode } = useMode();
  return (
    <EditViewProvider>
      {mode === 'edit' ? <EditMode /> : <PerformMode />}
    </EditViewProvider>
  );
}
