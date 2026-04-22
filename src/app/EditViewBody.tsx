import { useEditView } from '../edit-view/useEditView';
import { CuesView } from './CuesView';
import { PatchesView } from './PatchesView';
import { SetupView } from './SetupView';

export function EditViewBody() {
  const { editView } = useEditView();
  switch (editView) {
    case 'setup':
      return <SetupView />;
    case 'patches':
      return <PatchesView />;
    case 'cues':
      return <CuesView />;
  }
}
