# Data Model: Edit Mode View Switcher

**Feature**: `003-edit-view-nav`
**Date**: 2026-04-21

Edit Mode View Switcher introduces no persisted data. The only domain object is a single enumerated value held in session-scoped React context.

---

## EditView (value type)

A stable key identifying one of the Edit sub-views.

### Shape

```ts
// src/edit-view/EditViewContext.tsx (type lives alongside the context)
export type EditView = 'setup' | 'patches' | 'cues';

export const EDIT_VIEWS: readonly EditView[] = ['setup', 'patches', 'cues'] as const;

export const EDIT_VIEW_LABELS: Record<EditView, string> = {
  setup: 'Setup',
  patches: 'Patches',
  cues: 'Cues',
};
```

### Invariants

1. Exactly one `EditView` is active at all times while the app is running.
2. The default value (on cold launch, before any user input) is `'setup'` (FR-008).
3. `EDIT_VIEWS` lists the sub-views in UI display order (Setup → Patches → Cues). The order is part of the spec and must not be permuted (FR-002, FR-004).
4. `EDIT_VIEW_LABELS` provides the human-readable label for each key. Labels are exactly as written in the spec ("Setup", "Patches", "Cues") — no i18n in scope.

---

## EditViewContext (session state)

A React context providing the current `EditView` and a setter.

### Shape

```ts
// src/edit-view/EditViewContext.tsx
export interface EditViewContextValue {
  editView: EditView;
  setEditView: (next: EditView) => void;
}

export const EditViewContext = createContext<EditViewContextValue | null>(null);
```

### Provider invariants

1. The provider MUST be mounted above any component that renders the view switcher or the view body. In practice, it is mounted in `Shell.tsx`, above the `EditMode` / `PerformMode` switch.
2. Initial state MUST be `{ editView: 'setup' }`.
3. The provider MUST NOT persist `editView` to `AsyncStorage`, `SecureStore`, MMKV, or any other durable storage. Session-only state is sufficient because `Shell` does not unmount on background/foreground transitions, and the spec's Assumptions explicitly opt out of cross-launch persistence.
4. `setEditView` MUST accept any `EditView` value and MUST overwrite the current selection unconditionally (no guard preventing a no-op call). A no-op assignment (e.g., `setEditView('setup')` when `editView === 'setup'`) is allowed and MUST NOT cause an error.
5. The context value returned by `useMemo` MUST be referentially stable between renders when neither `editView` nor `setEditView` changes — this prevents downstream consumers from re-rendering on every parent render.
6. A component consuming `useEditView()` outside a provider MUST receive a developer-facing error, not silent `undefined`. Mirrors the `ModeContext` convention.

### State transitions

The state machine is trivial: any of the three values can transition to any of the three values. There is no invalid transition. No side effects are attached to transitions.

```text
 setup  ⇄  patches
   ⇅        ⇅
 cues  ⇄  patches
   ⇅
 cues
```

(Every pair of states is connected.)

### Lifecycle

- **App cold launch**: `Shell` mounts `EditViewProvider`; `editView` initializes to `'setup'`.
- **Entering Edit mode**: `EditMode` mounts; its consumers read the current `editView`.
- **Switching to Perform mode**: `EditMode` unmounts, but `EditViewProvider` remains mounted (it is above the `EditMode`/`PerformMode` switch in `Shell`). `editView` is preserved.
- **Returning to Edit mode**: `EditMode` re-mounts; its consumers read the preserved `editView`, satisfying US3.
- **Background / foreground**: React does not unmount the component tree on backgrounding (FR-010 from feature 001 established this invariant). `editView` persists through app backgrounding.
- **App cold restart (process kill and relaunch)**: provider re-initializes to `'setup'`. No persistence.

---

## LayoutMode (value type)

A coarse classification of the current window width, driving which header variant renders.

### Shape

```ts
// src/layout/useLayoutMode.ts
export type LayoutMode = 'phone' | 'tablet';
```

### Computation

```ts
// src/layout/breakpoints.ts
export const TABLET_MIN_WIDTH = 600; // logical pixels (dp on Android, pt on iOS)

// src/layout/useLayoutMode.ts
import { useWindowDimensions } from 'react-native';
import { TABLET_MIN_WIDTH } from './breakpoints';

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH ? 'tablet' : 'phone';
}
```

### Invariants

1. `useLayoutMode()` is a pure function of `useWindowDimensions().width` and the `TABLET_MIN_WIDTH` constant. No timers, no async work.
2. The hook re-evaluates whenever React re-renders; React re-renders on dimension change because `useWindowDimensions` is itself a state subscription.
3. The classification is a closed two-value set. Callers can switch exhaustively.
4. The exact boundary value (width === 600) is classified as `'tablet'` (>=, not >). This is deterministic and testable.

---

## Relationships

```
Shell
 └── EditViewProvider (holds editView)
      └── (conditional) EditMode
           ├── EditViewHeaderControl ──► useLayoutMode()
           │     ├── (tablet) EditViewSegmented  ──► useEditView()
           │     └── (phone)  EditViewDropdown   ──► useEditView() + useMode() (for 'perform' selection)
           └── EditViewBody ─────────────► useEditView()
                 ├── (editView='setup')   SetupView
                 ├── (editView='patches') PatchesView
                 └── (editView='cues')    CuesView
      └── (conditional) PerformMode
```

`useEditView()` and `useLayoutMode()` are the only two hooks consumed by the new UI. `useMode()` from feature 001 is consumed by `EditViewDropdown` to implement the dropdown's `Perform` entry and by the tablet's standalone `Perform` button (unchanged from today).

---

## Not modeled

- **Persisted state**: deliberately out of scope. No AsyncStorage keys are introduced by this feature.
- **Per-sub-view state**: each placeholder view carries no state. When the real feature content lands in follow-up work, those features will introduce their own contexts or stores as needed.
- **Transition metadata**: no record of "last selected view" beyond the live `editView` value. FR-009 is satisfied by the fact that `editView` itself is preserved — no separate "lastEditView" pointer is needed.
