# UI Surfaces Contract: Edit Mode View Switcher

**Feature**: `003-edit-view-nav`
**Date**: 2026-04-21

This contract pins the observable surface of every new or updated UI element in this feature: testIDs, accessibility roles/labels/states, minimum hit-target sizes, and the exact behavior tests should assert. Downstream tests and the task list both reference these rows.

---

## 1. Edit header — tablet variant

Rendered when `useLayoutMode() === 'tablet'`.

### Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [Perform]   [Setup | Patches | Cues]   [MIDI activity readout]   [Prefs ⚙] │
└──────────────────────────────────────────────────────────────────────────────┘
```

- `Perform` button, `Segmented` control, `MidiActivityDisplay`, `Preferences gear` — in that left-to-right order.
- `Perform` button: unchanged from feature 001 (same testID `edit-header` ancestor; same `accessibilityLabel="Perform"`).
- `Segmented` control sits immediately to the right of `Perform`.
- `MidiActivityDisplay` stays in the flexible center.
- `Preferences gear` stays at the far right.

### testIDs

| ID                          | Element                                         |
|-----------------------------|-------------------------------------------------|
| `edit-header`               | Outer header `<View>` (existing, unchanged).    |
| `edit-view-segmented`       | The segmented control container.                |
| `edit-view-segment-setup`   | Setup segment.                                  |
| `edit-view-segment-patches` | Patches segment.                                |
| `edit-view-segment-cues`    | Cues segment.                                   |

### Accessibility

| Element              | Role       | Label      | State                         |
|----------------------|------------|------------|-------------------------------|
| Segmented container  | `tablist`  | (none)     | —                             |
| Each segment         | `tab`      | e.g. "Setup" | `{ selected: isActive }`    |

### Hit targets

- Each segment: minimum width 88 pt (fits 7-char label comfortably at 16 pt / 600 weight); minimum height 44 pt.
- Focus ring: reuses `colors.focusRing`; 2 pt stroke on the segment's outer border when focused; does not shift layout.

### Interaction

- Tap a segment → `setEditView(segmentKey)`.
- Re-tap the currently-selected segment → no-op (no state change, no error).
- Keyboard: segments are in tab order. `Enter` / `Space` on a focused segment activates it.

---

## 2. Edit header — phone variant

Rendered when `useLayoutMode() === 'phone'`.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  [View ▾]    [MIDI activity readout]    [Prefs ⚙]   │
└──────────────────────────────────────────────────────┘
```

- `View` dropdown button occupies the leftmost slot — the same slot the tablet layout reserves for the `Perform` button.
- The standalone `Perform` button is NOT rendered. Perform mode is reachable through the dropdown.

### testIDs

| ID                          | Element                                 |
|-----------------------------|-----------------------------------------|
| `edit-header`               | Outer header `<View>` (existing).       |
| `edit-view-dropdown-button` | The `View` anchor button.               |
| `edit-view-dropdown-menu`   | The dropdown menu container (only present when open). |
| `edit-view-menu-setup`      | Setup menu item.                        |
| `edit-view-menu-patches`    | Patches menu item.                      |
| `edit-view-menu-cues`       | Cues menu item.                         |
| `edit-view-menu-perform`    | Perform menu item.                      |
| `edit-view-menu-backdrop`   | Transparent full-surface backdrop `Pressable`. |

### Accessibility

| Element             | Role       | Label                      | State                       |
|---------------------|------------|----------------------------|-----------------------------|
| `View` anchor button | `button`  | "View" — always the literal string "View". The current sub-view is indicated inside the menu (via leading checkmark and `selected` state), never on the anchor. | —                           |
| Menu container      | `menu`     | (none)                     | `accessibilityViewIsModal=true` |
| Each menu item      | `menuitem` | e.g. "Setup"               | `{ selected: isActive }` (Setup/Patches/Cues only; Perform has no `selected` state) |

### Hit targets

- `View` anchor: minimum 88 × 44 pt.
- Each menu item: minimum height 44 pt; full menu width.
- Menu spacing: ≥ 4 pt vertical padding between items and the menu edge.

### Interaction

- Tap `View` button → open the dropdown.
- Tap a menu item for Setup / Patches / Cues → `setEditView(key)` and close.
- Tap the menu item for Perform → `setMode('perform')` and close.
- Tap the backdrop → close with no state change.
- Android back gesture → `onRequestClose` → close with no state change.
- External keyboard `Escape` on an open menu → close with no state change.

### Selected-state indication

- The currently selected Edit sub-view has a leading check glyph (`Ionicons name="checkmark"`) to the left of its label AND `accessibilityState.selected = true`.
- The `Perform` item never shows the check (it does not represent a sub-view state).

---

## 3. Edit body

### Layout

```
<EditMode>
  <header>…</header>
  <EditViewBody />      ← new
</EditMode>
```

`EditViewBody` renders one of:

| editView value | Component rendered | testID        |
|----------------|--------------------|---------------|
| `'setup'`      | `<SetupView />`    | `view-setup`   |
| `'patches'`    | `<PatchesView />`  | `view-patches` |
| `'cues'`       | `<CuesView />`     | `view-cues`    |

Each placeholder view renders a centered label with the display name ("Setup" / "Patches" / "Cues") on `colors.surface`. Minimum requirements: the label must be visible and readable in dark mode at the default system font size; the testID must be present.

---

## 4. Behavior contracts (must be asserted by tests)

### `EditViewContext`

| Contract                                                                                  | Test file                              |
|-------------------------------------------------------------------------------------------|----------------------------------------|
| Default value is `'setup'`.                                                               | `__tests__/edit-view/EditViewContext.test.tsx` |
| `setEditView('patches')` updates the context; consumers see `'patches'` on next render.   | same                                   |
| `setEditView` identity is stable across re-renders (via `useMemo`).                        | same                                   |
| No AsyncStorage access of any kind during provider mount/update. *(asserted by mocking AsyncStorage and expecting zero calls.)* | same                                   |
| Consumer outside the provider throws a developer-facing error on `useEditView()`.         | same                                   |

### `useLayoutMode`

| Contract                                            | Test file                          |
|-----------------------------------------------------|------------------------------------|
| Returns `'phone'` for width = 599.                  | `__tests__/layout/useLayoutMode.test.tsx` |
| Returns `'tablet'` for width = 600.                 | same                               |
| Returns `'tablet'` for width = 9999.                | same                               |
| Re-evaluates when `useWindowDimensions` width changes. | same                               |

### `EditViewSegmented`

| Contract                                                                                       | Test file                                 |
|------------------------------------------------------------------------------------------------|-------------------------------------------|
| Renders three segments in order: Setup, Patches, Cues.                                         | `__tests__/app/EditViewSegmented.test.tsx` |
| Tapping a segment calls `setEditView(segmentKey)`.                                             | same                                      |
| The segment whose key matches current `editView` has `accessibilityState.selected === true`.   | same                                      |
| Other segments have `accessibilityState.selected === false`.                                   | same                                      |
| Tapping the currently-selected segment is a no-op (setEditView may still be called, but context value doesn't change — optional assertion). | same                                      |

### `EditViewDropdown`

| Contract                                                                                         | Test file                                 |
|--------------------------------------------------------------------------------------------------|-------------------------------------------|
| Renders a `View` anchor button when closed; menu container is NOT in the tree when closed.       | `__tests__/app/EditViewDropdown.test.tsx`  |
| Tapping the `View` button opens the menu (menu container appears in the tree).                   | same                                      |
| Menu items appear in order: Setup, Patches, Cues, Perform.                                       | same                                      |
| Tapping Setup / Patches / Cues calls `setEditView(key)` and closes the menu.                     | same                                      |
| Tapping Perform calls `setMode('perform')` and closes the menu (does NOT call `setEditView`).    | same                                      |
| Tapping the backdrop closes the menu and leaves `editView` + `mode` unchanged.                   | same                                      |
| `onRequestClose` on the Modal (Android back) closes the menu.                                    | same                                      |
| The currently-selected Edit sub-view has `accessibilityState.selected === true`; others (including Perform) have `false` or undefined. | same                                      |

### `EditMode` (update)

| Contract                                                                                 | Test file                            |
|------------------------------------------------------------------------------------------|--------------------------------------|
| When window width = 800, the segmented control renders AND the `Perform` button renders. | `__tests__/app/EditMode.test.tsx`    |
| When window width = 400, the `View` dropdown button renders AND no standalone `Perform` button is present. | same                                 |
| The body area renders the component matching `editView` (`view-setup` / `view-patches` / `view-cues`). | same                                 |
| Switching `editView` swaps the body testID on next render.                               | same                                 |
| `MidiActivityDisplay` and the preferences gear remain present in both variants.          | same                                 |

### `Shell` (session preservation)

| Contract                                                                                                  | Test file                   |
|-----------------------------------------------------------------------------------------------------------|-----------------------------|
| Set `editView='patches'` → switch mode to `perform` → switch back to `edit` → `view-patches` is rendered. | `__tests__/app/Shell.test.tsx` |

---

## 5. Theme tokens (additive)

Add to `src/theme/colors.ts`:

| Token                   | Purpose                                                               | Contrast requirement                   |
|-------------------------|-----------------------------------------------------------------------|----------------------------------------|
| `segmentedTrack`        | Segmented control container background (unselected segment grouping). | — (container, no text)                 |
| `segmentedSelected`     | Filled background of the selected segment.                            | ≥ 4.5:1 against `textPrimary` (label)  |
| `segmentedLabel`        | Label color for unselected segments.                                  | ≥ 4.5:1 against `segmentedTrack`       |
| `segmentedLabelSelected`| Label color for the selected segment.                                 | ≥ 4.5:1 against `segmentedSelected`    |
| `menuSurface`           | Dropdown menu background.                                              | (background)                           |
| `menuDivider`           | Hairline divider between menu items (optional).                       | —                                      |
| `menuItemPressed`       | Pressed-state overlay for menu items.                                 | —                                      |

Existing tokens reused unchanged: `surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `focusRing`, `accent`, `accentPressed`, `onAccent`.

All new tokens MUST pass WCAG AA for the foreground/background combinations listed above. The tasks list will include a step to verify contrast once the concrete hex values are chosen.

---

## 6. Out of scope for this contract

- The concrete content of Setup / Patches / Cues beyond the placeholder label — delivered by follow-up features.
- Animations between sub-views (the body swap is instantaneous per SC-003).
- Arrow-key navigation within the segmented control — deferred to a later UX pass.
- Persisting `editView` across cold launches — explicitly out of scope per spec Assumptions.
- Internationalization of the labels ("Setup", "Patches", "Cues", "View", "Perform").
