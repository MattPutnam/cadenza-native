# UI Surfaces Contract: Setup Tab — Keyboard Configuration

**Feature**: `005-setup-keyboards`
**Date**: 2026-04-22

This contract pins the observable surface of every new or updated UI element: testIDs, accessibility, props, layouts, and the exact behaviors tests must assert.

---

## 1. SetupView (screen root)

The Setup sub-view, rendered by `EditViewBody` when `editView === 'setup'`.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Keyboard 1 row/card]                                   │
│  [Keyboard 2 row/card]                                   │
│  ...                                                     │
│  [+ Add Keyboard button]                                 │
└──────────────────────────────────────────────────────────┘
```

- Root `<ScrollView>` with `testID="setup-view"` containing:
  - One `<KeyboardRow>` per Keyboard when `useLayoutMode() === 'tablet'`.
  - One `<KeyboardCard>` per Keyboard when `useLayoutMode() === 'phone'`.
  - An "Add Keyboard" button at the end, `testID="setup-add-keyboard"`, `accessibilityLabel="Add Keyboard"`.

### testIDs

| ID                          | Element                                              |
|-----------------------------|------------------------------------------------------|
| `setup-view`                | Root ScrollView.                                     |
| `setup-keyboard-<id>`       | Root View of each Keyboard row/card.                 |
| `setup-add-keyboard`        | Add Keyboard button.                                 |

### Behavior

- Renders content only after `useKeyboards().isLoaded === true`. Before that, renders an empty ScrollView (loading state is invisible — no spinner).
- On tablet, each Keyboard row spans the full width; cards (on phone) span the full width of the scroll content area.
- Scrolls vertically when content exceeds the viewport (phone case with many keyboards).

---

## 2. KeyboardRow (tablet layout)

Renders when `useLayoutMode() === 'tablet'`.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Size ▾]  [Device ▾]  [Ch ▾]  [Nickname_____]  [🗑]    │  ← controls row
│                                                          │
│  [Keyboard visualization — feature 004 <Keyboard/>]      │
│                                                          │
│  [⚠ Channel conflict]  (only when in conflict)           │
└──────────────────────────────────────────────────────────┘
```

- Outermost `<View testID={setup-keyboard-<id>}>`.
- Top row: `<KeyboardControls />` (see §4) with its child controls visible per the rules.
- Below: `<Keyboard low={range.low} high={range.high} highlighted={[]} />` (feature 004 component).
- Below the keyboard: an inline conflict-warning banner, visible only when the Keyboard's ID is in `detectConflicts(keyboards)`.

### testIDs

| ID                                       | Element                                 |
|------------------------------------------|-----------------------------------------|
| `setup-keyboard-<id>-controls`           | Controls row container.                 |
| `setup-keyboard-<id>-visual`             | Wrapper around the `<Keyboard />`.      |
| `setup-keyboard-<id>-conflict-warning`   | Conflict warning banner (only when present). |

---

## 3. KeyboardCard (phone layout)

Renders when `useLayoutMode() === 'phone'`.

### Layout

```
┌──────────────────────────────────────┐
│  [Size ▾]                            │
│  [Device ▾]       [Nickname_____]    │
│  [Channel ▾]                         │
│  [⚠ Channel conflict]                │
│                              [🗑]    │
└──────────────────────────────────────┘
```

- Outermost `<View testID={setup-keyboard-<id>}>` with card styling (rounded corners, `colors.surfaceElevated` background, `colors.border` hairline border).
- Controls stacked vertically inside the card.
- No `<Keyboard />` component on phone (FR-015).

### testIDs

Same as §2 where applicable, plus the card carries `setup-keyboard-<id>` on its root.

---

## 4. KeyboardControls (shared)

Consumed by both `KeyboardRow` (tablet) and `KeyboardCard` (phone). Takes the Keyboard + derived state props; renders the appropriate controls.

### Props

```ts
interface KeyboardControlsProps {
  keyboard: Keyboard;
  position: number;                // 0-indexed; used for default display name
  isOnlyKeyboard: boolean;         // true when list.length === 1
  devices: readonly MidiDevice[];  // currently-connected
  isInConflict: boolean;           // derived from detectConflicts
  sharedDeviceSiblings: readonly Keyboard[]; // other keyboards on same device (for channel defaulting)
  onChange: (patch: Partial<Omit<Keyboard, 'id'>>) => void;
  onDelete: () => void;
  layout: 'tablet' | 'phone';
}
```

### Conditional visibility

| Control              | Visible when                                              |
|----------------------|-----------------------------------------------------------|
| Display-name heading | `!isOnlyKeyboard`.                                        |
| Size dropdown        | Always.                                                   |
| Device dropdown      | `!isOnlyKeyboard` (two or more Keyboards exist).          |
| Channel dropdown     | `!isOnlyKeyboard` AND `sharedDeviceSiblings.length >= 1`. |
| Nickname field       | `!isOnlyKeyboard`.                                        |
| Delete button        | `!isOnlyKeyboard`.                                        |

### testIDs

| ID                                          | Element                                            |
|---------------------------------------------|----------------------------------------------------|
| `setup-keyboard-<id>-name`                  | Display-name heading (only when `!isOnlyKeyboard`). |
| `setup-keyboard-<id>-size`                  | Size dropdown anchor.                              |
| `setup-keyboard-<id>-device`                | Device dropdown anchor (only when visible).        |
| `setup-keyboard-<id>-channel`               | Channel dropdown anchor (only when visible).       |
| `setup-keyboard-<id>-nickname`              | Nickname TextInput (only when visible).            |
| `setup-keyboard-<id>-delete`                | Delete button (only when visible).                 |
| `setup-keyboard-<id>-device-warning`        | Warning icon view inside the device anchor (only when device is selected but disconnected). |

### Accessibility

- Each dropdown anchor: `accessibilityRole="button"`, `accessibilityLabel` of the form `"Size"`, `"Device"`, `"Channel"` (plus the current value — e.g., `"Size, 88 keys"`).
- Disconnected-device warning state: anchor's `accessibilityLabel` includes `"disconnected"` prefix (e.g., `"Device, Roland A-49, disconnected"`).
- Channel conflict warning: separate inline view carries `accessibilityRole="alert"` with text `"Channel conflict: two keyboards on the same device and channel."`
- Nickname input: `accessibilityLabel="Nickname"`; `maxLength={32}`.
- Delete button: `accessibilityLabel="Delete Keyboard"`, no-op with disabled state when `isOnlyKeyboard === true` (never rendered in that state, but defensive).

### Interaction

- Size change → `onChange({ size: newSize })`.
- Device change → `onChange({ deviceName: newName })`. If the new device is shared with another Keyboard (and the current Keyboard has no channel yet), the context (or caller) assigns the lowest unused channel as part of the same state update. If the new device is unique, channel is set to `null`.
- Channel change → `onChange({ channel: newChannel })`.
- Nickname change → `onChange({ nickname: nextText || null })` (treat empty string as `null`).
- Delete press → `onDelete()`.

---

## 5. Dropdown (generic)

One parameterised component handling Size, Device, and Channel dropdowns.

### Props

```ts
interface DropdownProps<T> {
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (next: T) => void;
  placeholder?: string;          // shown when options is empty and value is missing
  testID?: string;
  accessibilityLabel: string;
  disabled?: boolean;
  trailingIcon?: ReactNode;      // shown inside the anchor (e.g., warning)
}

interface DropdownOption<T> {
  value: T;
  label: string;
  trailingIcon?: ReactNode;      // shown inside this option's row (e.g., warning)
  testID?: string;
}
```

### Behavior

- Closed state: renders a `<Pressable>` anchor showing the selected option's label (or `placeholder` if the value has no matching option and `placeholder` is given).
- Anchor shows the chevron glyph (`Ionicons name="chevron-down"`) by default; when `trailingIcon` is provided, it replaces the chevron.
- Tapping the anchor opens a `<Modal transparent animationType="fade">` with:
  - Full-surface `<Pressable testID={<testID>-menu-backdrop}>` backdrop that dismisses on tap.
  - Menu `<View testID={<testID>-menu}>` anchored below the anchor (best-effort positioning via `measureInWindow`; falls back to open even if measurement does not fire, per the feature 003 pattern).
  - One `<Pressable>` per option with `testID={<testID>-option-<value>}`, `accessibilityRole="menuitem"`, `accessibilityState={{ selected: value === currentValue }}`, rendering the option's `label` (and its `trailingIcon` if present).
- Selecting an option → `onChange(option.value)` then closes.
- Tapping backdrop or Android back → closes without invoking `onChange`.
- `disabled={true}` → renders the anchor non-interactive (greyed out). Never opens the menu.

### testIDs

| ID                               | Element                                     |
|----------------------------------|---------------------------------------------|
| `<testID>`                       | Anchor button (driven by the prop).         |
| `<testID>-menu`                  | Menu container when open.                   |
| `<testID>-menu-backdrop`         | Backdrop Pressable when open.               |
| `<testID>-option-<value>`        | Each option row.                            |

### Accessibility

- Anchor: `accessibilityRole="button"`, `accessibilityLabel` from prop.
- Menu: `accessibilityRole="menu"`.
- Option: `accessibilityRole="menuitem"` + `accessibilityState.selected`.
- `focusable={true}` on the anchor and on every option.
- Focus ring using `colors.focusRing` on focused anchor / option (matching feature 003 pattern).

---

## 6. Behavior contracts (tests that must exist)

### `schema.ts`

| Contract                                                                                  | Test file                                |
|-------------------------------------------------------------------------------------------|------------------------------------------|
| `KEYBOARD_SIZES` is `[25, 37, 49, 61, 73, 76, 88]` in that order.                         | `__tests__/keyboards/schema.test.ts`     |
| `sizeToRange(s)` returns the table row's low/high for every `s`.                          | same                                     |
| `sizeToRange(s).high - .low + 1 === s` for every `s`.                                     | same                                     |
| `sizeToRange(s).low` and `.high` are both white keys (use `isWhiteKey` from feature 004). | same                                     |

### `conflicts.ts`

| Contract                                                                                  | Test file                                |
|-------------------------------------------------------------------------------------------|------------------------------------------|
| Empty list → empty set.                                                                   | `__tests__/keyboards/conflicts.test.ts`  |
| Single keyboard → empty set.                                                              | same                                     |
| Two keyboards on same device + same channel → set contains both IDs.                      | same                                     |
| Two keyboards on same device + different channels → empty set.                            | same                                     |
| Three keyboards same device + same channel → set contains all three IDs.                  | same                                     |
| Keyboards with `deviceName === null` or `channel === null` are never in conflict.         | same                                     |

### `storage.ts`

| Contract                                                                                  | Test file                                |
|-------------------------------------------------------------------------------------------|------------------------------------------|
| `loadKeyboards()` returns `null` on read miss.                                            | `__tests__/keyboards/storage.test.ts`    |
| `loadKeyboards()` returns the parsed list when storage is well-formed.                    | same                                     |
| `loadKeyboards()` returns `null` on JSON parse error (malformed storage).                 | same                                     |
| `saveKeyboards(list)` round-trips through `loadKeyboards()`.                              | same                                     |
| `saveKeyboards()` swallows write errors (simulated by mocking `setItem` to reject).       | same                                     |

### `KeyboardsContext.tsx`

| Contract                                                                                     | Test file                                   |
|----------------------------------------------------------------------------------------------|---------------------------------------------|
| Default state on cold launch (no storage) is exactly one Keyboard, size 88, all other fields null. | `__tests__/keyboards/KeyboardsContext.test.tsx` |
| `isLoaded` is `false` initially, flips to `true` once the initial load resolves.             | same                                        |
| `add()` appends a new default (88-key, null device/channel/nickname) with a unique `id`.     | same                                        |
| `update(id, { size: 61 })` changes only the targeted Keyboard.                               | same                                        |
| `update` merges partial patches; untouched fields remain intact.                             | same                                        |
| `remove(id)` removes that Keyboard when more than 1 exists.                                   | same                                        |
| `remove(id)` is a no-op when only 1 Keyboard remains.                                         | same                                        |
| After any CRUD, `saveKeyboards` is called with the new list.                                  | same                                        |
| Storage read miss synthesises the default single-88 state without saving.                     | same                                        |
| Storage parse error also synthesises the default state.                                       | same                                        |
| `useKeyboards()` outside the provider throws a developer-facing error.                        | same                                        |

### `Dropdown.tsx`

| Contract                                                                                  | Test file                             |
|-------------------------------------------------------------------------------------------|---------------------------------------|
| Closed by default; menu testID is NOT in the tree.                                         | `__tests__/keyboards/Dropdown.test.tsx` |
| Tapping the anchor opens the menu.                                                         | same                                  |
| Each option renders with its `testID` and `accessibilityRole="menuitem"`.                  | same                                  |
| `accessibilityState.selected` is `true` for the option matching `value`, `false` otherwise. | same                                  |
| Tapping an option calls `onChange` with that option's value and closes the menu.           | same                                  |
| Tapping the backdrop closes without invoking `onChange`.                                   | same                                  |
| `onRequestClose` (Android back) closes the menu.                                           | same                                  |
| Anchor is keyboard-reachable (`focusable !== false`); focus ring style applies on focus.   | same                                  |
| `disabled={true}` prevents the menu from opening on tap.                                   | same                                  |

### `SetupView.tsx`

| Contract                                                                                  | Test file                               |
|-------------------------------------------------------------------------------------------|-----------------------------------------|
| Renders exactly one Keyboard row/card on first launch (default state).                    | `__tests__/keyboards/SetupView.test.tsx` |
| On tablet width (800 pt), renders `<Keyboard>` for each Keyboard.                          | same                                    |
| On phone width (400 pt), does NOT render any `<Keyboard>` (no `testID="keyboard"` present). | same                                    |
| Single Keyboard: size dropdown is present; device / channel / nickname / delete are NOT.  | same                                    |
| After `add()`: a second Keyboard appears; device dropdown and nickname field appear on BOTH. | same                                    |
| With 2 Keyboards on the same device: channel dropdown appears on BOTH.                    | same                                    |
| With 2 Keyboards on same device + same channel: `setup-keyboard-<id>-conflict-warning` present on both. | same                                    |
| With a Keyboard whose `deviceName` is not in the `devices` list: `setup-keyboard-<id>-device-warning` present. | same                                    |
| With 2 Keyboards and empty `devices` list, device dropdown anchor displays `"<No input detected>"` and is disabled (tap does not open menu; no `onChange` fires). | same                                    |
| Live device change: rerender with an enlarged `devices` list; the new device appears as a selectable option. | same                                    |
| Layout swap mid-edit (mock `useWindowDimensions` 800 → 400 → 800 with a half-typed nickname): state survives both swaps; header variant swaps KeyboardRow ↔ KeyboardCard. | same                                    |
| Display-name heading `setup-keyboard-<id>-name` shows `"Keyboard N"` when nickname is null / empty, and the nickname string when non-empty. | same                                    |

---

## 7. Theme tokens (additive)

Add to `src/theme/colors.ts`:

| Token       | Purpose                                  | Contrast target                                 |
|-------------|------------------------------------------|-------------------------------------------------|
| `warning`   | Warning icon + conflict banner accent.   | ≥ 3:1 against `surface` and `surfaceElevated` (UI component, WCAG AA). |

Suggested value: `#F59E0B` (amber). Verify in Phase 6.

Existing tokens reused: `surface`, `surfaceElevated`, `border`, `textPrimary`, `textSecondary`, `focusRing`, `accent`, `menuSurface`, `menuDivider`, `menuItemPressed`.

---

## 8. Out of scope for this contract

- Reordering Keyboards (FR-018).
- Custom sizes beyond the seven standard values (FR-004).
- Integration with runtime MIDI routing — Setup is a configuration surface only.
- Onboarding / first-launch tour beyond rendering the default single-88 state.
- Visual regression testing (Chromatic / Percy).
- Nicknames with non-English text normalisation (no specific i18n work).
- Offering a "quick-pair" shortcut for connecting new devices on-the-fly from this surface.
