import { useMode } from '../mode/useMode';
import { EditMode } from './EditMode';
import { PerformMode } from './PerformMode';

export function Shell() {
  const { mode } = useMode();
  return mode === 'edit' ? <EditMode /> : <PerformMode />;
}
