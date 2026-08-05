# umbra - API Reference

> **Maintenance**: This file is handwritten and must be kept in sync with the library source manually. It is not auto-generated.

## Architecture Overview

**Headless** dialog/modal management library built on a **primitive + template** layered design. The library exports no UI components — users bring their own.

### Entry points

Every snippet below imports from one of two specifiers, and which one is not cosmetic:

- **`umbra`** — the framework-agnostic core. The manager, the store engine,
  `normalizeError`, `Key`. Resolves with React not installed.
- **`umbra/react`** — the React binding (all hooks, `ModalOutlet`), **plus a wholesale
  re-export of the root**. A React app can import everything from here and never touch the root.

A snippet using only core symbols is shown on the root deliberately, to mark it as usable from
non-React code. React consumers may read every `umbra` import below as
`umbra/react` if they prefer a single import path.

### Core Concepts

1. **`useModal`** — Base primitive. Renders a native `<dialog>` inline (or via `createPortal` when `portal: true`).
2. **Template hooks** — `useMessageModal`, `useSlideModal` provide headless modal logic (animation, positioning). No UI wrapper — users provide their own components in the `render` callback.
3. **Actions** — declared by being rendered: `action('save', handler)` inside `render` returns `{ onClick, loading, disabled }` to spread. For custom state, use `createStore`/`useStore` alongside.
4. **`handle.close(reason, data?)`** — Closes the modal with a typed result (`handle` is the render-context close handle).
5. **`ModalOutlet`** — Optional portal manager. Wrap a subtree to auto-render modals without placing `{modal.Modal}` in JSX.

> **Note:** For reference UI component implementations (MUI and vanilla HTML/CSS), see `playground/src/entities/modal-template/ui/`.

---

## Actions

An action is declared by being rendered. The `action` factory handed to `render` names a reason,
binds a handler and returns the props to spread onto a button — one expression, at the one place
the action is used. There is no action config, no second hook, and nothing to pass into
`useModal`.

```tsx
import { useMessageModal } from 'umbra/react';

const modal = useMessageModal({
  id: 'confirm',
  render: ({ action }) => (
    <>
      <button {...action('cancel')}>Cancel</button>
      <button
        {...action('confirm', async (close) => {
          await api.confirm();
          close();
        })}
      >
        Confirm
      </button>
    </>
  ),
  onClose: (result) => report(result.reason), // 'confirm' | 'cancel' | 'dismiss'
});
```

**The reason is the action's identity.** It names the action and it is what the modal closes
with; nothing restates it. Omit the handler (`action('cancel')`) and the action auto-closes with
its own reason.

### `action(reason, handlerOrOptions?)`

| Argument           | Type                                                  | Description                              |
| ------------------ | ----------------------------------------------------- | ---------------------------------------- |
| `reason`           | `TReason`                                             | Names the action and is the close reason |
| `handlerOrOptions` | `(close) => void \| Promise<void>` or `ActionOptions` | A bare handler, or the options bag below |

`ActionOptions`:

| Option     | Type                         | Description                                                                |
| ---------- | ---------------------------- | -------------------------------------------------------------------------- |
| `onAction` | `(close) => void \| Promise` | What the action does. Omit to auto-close with the reason                   |
| `onClick`  | `(event) => void`            | Runs **first**; call `preventDefault()` to veto the action                 |
| `disabled` | `boolean`                    | **Or**-ed with the action's own reasons — it can add one, never remove one |
| `type`     | `'button' \| 'submit'`       | Default `'button'`, so a spread is safe inside a `<form>`                  |
| `hotkey`   | `HotkeyDef`                  | Keyboard shortcut, dispatched by clicking the button                       |

Returned props: `{ type, onClick, loading, 'data-loading', disabled, 'aria-busy', 'aria-keyshortcuts'? }`.
`loading` is this action alone; `disabled` is true while **any** action runs, which is what stops
a double click submitting twice.

### Aggregated state

`render` also receives `isRunning` and `error` — the combined state of every action on the
modal — and the hook returns them too, for a trigger button outside the dialog:

```tsx
const modal = useModal({
  id: 'save',
  render: ({ action, isRunning, error }) => (
    <>
      <button {...action('save', save)} />
      {error ? <p role="alert">{error.message}</p> : null}
    </>
  ),
});

modal.isRunning; // same value, outside render
```

### Hotkeys

```tsx
render: ({ action }) => (
  <>
    <button {...action('cancel', { hotkey: Key.Escape })}>Cancel</button>
    <button {...action('confirm', { hotkey: Key.Enter, onAction: submit })}>OK</button>
  </>
);
```

The modal dispatches a hotkey by finding the button whose `aria-keyshortcuts` matches and
clicking it, so the key path and the click path are the same path — loading state, `disabled`
and any `onClick` veto all apply. If a hotkey collides with the modal's `dismissKey`, the action
wins and dismissal defers.

> **Custom button wrappers must forward `aria-keyshortcuts`** onto the real `<button>`, or the
> hotkey has nothing to find.

### Declaring the reasons

`useModal<TData, TReason>` optionally closes the set of reasons:

```tsx
const modal = useModal<User, 'submit' | 'cancel'>({ … });
```

With them declared, `action('submmit')` is a compile error, the reason autocompletes, and a
`switch` on `result.reason` in `onClose` is exhaustive. Left undeclared, any string is accepted.
`'dismiss'` is always available — the library produces it on Escape, backdrop click and teardown.

---

## useModal (Base Primitive)

```typescript
import { useModal } from 'umbra/react';

const modal = useModal({
  id: 'example',
});

const modal = useModal({
  id: 'my-modal',
  actions: state,
  render: ({ isPreparing, handle }) => (
    <div>
      <p>Content</p>
      <button {...state.confirm(async () => {
        await doSomething();
        handle.close('confirm');
      })}>Confirm</button>
    </div>
  ),
  onClose: (result) => console.log(result.reason),
});

// Returns
const { open, isOpen, isPreparing, Modal, waitForClose, handle } = modal;
```

### Render Args

| Property      | Type                 | Description                            |
| ------------- | -------------------- | -------------------------------------- |
| `isPreparing` | `boolean`            | Whether `onOpen` callback is executing |
| `handle`      | `ModalHandle<TData>` | `{ close(reason?, data?: TData) }`     |

### Options

| Option                    | Type                                          | Description                                                                                                                                                                                                                                              |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | `string`                                      | Unique modal identifier                                                                                                                                                                                                                                  |
| `render`                  | `(args: ModalRenderArgs<TData>) => ReactNode` | Render function                                                                                                                                                                                                                                          |
| `onKeyDown?`              | `(event: KeyboardEvent) => void`              | Escape hatch; runs before the action hotkeys the modal dispatches                                                                                                                                                                                        |
| `animation?`              | `ModalAnimation`                              | CSS transition config                                                                                                                                                                                                                                    |
| `onOpen?`                 | `() => void \| Promise<void>`                 | Called on open                                                                                                                                                                                                                                           |
| `onClose?`                | `(result) => void \| Promise<void>`           | Called on close                                                                                                                                                                                                                                          |
| `dismissKey?`             | `HotkeyDef \| false`                          | Key that dismisses the modal. Default: `Key.Escape`. Pass `false` to disable key dismissal. When an action hotkey matches `dismissKey`, the action takes priority automatically.                                                                         |
| `dismissOnBackdropClick?` | `boolean`                                     | Whether backdrop click dismisses the modal. Not applicable when `nonModal: true`. Default: `false` when `actions` are provided, `true` otherwise.                                                                                                        |
| `dismissOnClickOutside?`  | `boolean`                                     | Whether clicking outside the dialog dismisses it. Only applicable when `nonModal: true`. Respects `dismissWhilePreparing` and `actions.isRunning` guards. Default: `false`.                                                                              |
| `dismissWhilePreparing?`  | `boolean`                                     | Whether the dismiss key, backdrop click, and click-outside can close the modal while `onOpen` is executing. Default: `true`.                                                                                                                             |
| `nonModal?`               | `boolean`                                     | Use `dialog.show()` instead of `showModal()` (see below)                                                                                                                                                                                                 |
| `portal?`                 | `boolean`                                     | Render via `createPortal(node, document.body)`. Default: `false`. For non-modal dialogs, `true` = viewport-anchored (`fixed`); `false` = contained (anchored to its host — see below). Modal dialogs (top layer) are unaffected by ancestors either way. |

### Non-Modal Dialogs

Pass `nonModal: true` to open the dialog with `dialog.show()` instead of `dialog.showModal()`. The dialog renders without a backdrop and does not enter the browser's top layer, allowing clicks on elements underneath. Useful for slide panels that display supplementary content while the user continues interacting with the main UI.

```typescript
const panel = useSlideModal({
  id: 'detail-panel',
  direction: 'right',
  nonModal: true,
  render: ({ handle }) => (
    <div>
      <p>Panel content — click elements underneath</p>
      <button onClick={() => handle.close('close')}>Close</button>
    </div>
  ),
});
```

**Behaviour differences from modal dialogs:**

| Aspect         | `showModal()` (default)                                                      | `nonModal: true`                                                                                |
| -------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Backdrop       | Native `::backdrop` blocks clicks                                            | No backdrop — clicks pass through                                                               |
| Top layer      | Browser top layer                                                            | Normal document flow with computed `z-index`                                                    |
| Body scroll    | Locked (`data-dialog-open` on body), scrollbar width compensated — see below | Not locked                                                                                      |
| Z-index        | Managed by browser                                                           | `1300 + stack position` (from `openedAt` sorting)                                               |
| Data attribute | `data-modal-z` set for debugging                                             | `data-modal-z` set for debugging                                                                |
| Dismiss key    | `dismissKey` (default `Key.Escape`), requires focus                          | `dismissKey` (default `Key.Escape`), window-capture — no focus needed                           |
| Backdrop click | Configurable via `dismissOnBackdropClick`                                    | No effect (no backdrop exists)                                                                  |
| Click outside  | N/A (use `dismissOnBackdropClick`)                                           | Configurable via `dismissOnClickOutside` (default: `false`)                                     |
| Portal         | Inline by default (`portal: false`)                                          | Inline by default (`portal: false`)                                                             |
| Positioning    | Top layer — viewport-anchored regardless of portal                           | `portal: true` → viewport (`fixed`); `portal: false` → contained (`absolute`, anchored to host) |

#### Body scroll lock (modal only)

While at least one **blocking** dialog is open, the library sets `data-dialog-open` on `<body>` and applies `overflow: hidden`. Hiding overflow removes a classic scrollbar, which widens the viewport and shifts every centered or right-aligned element — so the reclaimed width is reserved as body padding and the layout stays put.

The compensation is the width the lock **actually reclaims**, not the current scrollbar width. Those differ, and the difference matters:

| Page                       | Gutter before → after | Compensation |
| -------------------------- | --------------------- | ------------ |
| classic scrollbar          | 15 → 0                | 15px         |
| overlay scrollbar (mobile) | 0 → 0                 | 0            |
| `scrollbar-gutter: stable` | 15 → 15               | 0            |

The last row is why: such a page keeps its gutter through `overflow: hidden`, so padding by the scrollbar width would shift content _inward_ — a jump in the opposite direction.

`position: fixed` elements are **not** touched — walking your DOM to find them would be the opposite of headless. Instead the amount is published as `--dialog-scrollbar-width` on `:root` while the lock is held (always defined, `0px` when nothing was reclaimed), so you can opt in exactly where it matters:

```css
.app-header,
.toast-stack {
  padding-right: var(--dialog-scrollbar-width, 0px);
}
```

Non-modal dialogs never lock scrolling.

#### Non-modal positioning: contained vs. portal

A non-modal dialog never enters the top layer, so where it anchors depends on `portal`:

- **`portal: true`** — portaled to `document.body` and anchored to the viewport (`position: fixed`). Use this for viewport-edge or centered non-modal panels.
- **`portal: false` (default) — "contained"** — the dialog renders inside a library-owned `position: relative` wrapper and is positioned `absolute` against it. This is **immune to a transformed / `will-change` ancestor** hijacking the containing block (a `fixed` inline dialog would otherwise jump to that ancestor and flicker as the transform toggles). In return, it fills — and slides from — its nearest **sized** ancestor, so give it a sized, positioned host region; otherwise the panel collapses. It is an _inline contained panel_, not a viewport overlay. Slide templates size to `100%` (not `100dvw`/`100dvh`) in this mode.

---

## ModalAnimation

CSS transition configuration passed to the `animation?` option on any hook (`useModal`, `useMessageModal`, `useSlideModal`).

```typescript
type ModalAnimation = {
  entrance: CSSProperties; // styles applied after animation starts
  exit: CSSProperties; // styles applied during exit (and before entrance)
  duration?: number; // entrance duration in ms. Default: 200
  exitDuration?: number; // exit duration in ms. Falls back to `duration`
  transitionProperty?:
    'opacity' | 'transform' | 'opacity, transform' | 'all' | 'none' | (string & {}); // Default: 'opacity'
};
```

**Default animations:**

- `useMessageModal` — fade (`opacity 0 → 1`), 300 ms in / 150 ms out
- `useSlideModal` — direction-based translate, 300 ms in / 200 ms out

### Disabling animation

Set both `duration` and `exitDuration` to `0` to open/close without any transition. The `entrance`/`exit` styles still need to be provided (they describe the start and end CSS state), but the transition completes instantly.

**Message modal:**

```typescript
const NO_ANIMATION = {
  entrance: { opacity: 1 },
  exit: { opacity: 0 },
  duration: 0,
  exitDuration: 0,
  transitionProperty: 'opacity',
};

const modal = useMessageModal({ id: 'fast', animation: NO_ANIMATION, render: () => ... });
```

**Slide panel** — the `entrance`/`exit` transforms must match the direction you choose:

```typescript
// direction: 'left'
const NO_ANIMATION = {
  entrance: { transform: 'translateX(0)' },
  exit: { transform: 'translateX(-100%)' },
  duration: 0,
  exitDuration: 0,
  transitionProperty: 'transform',
};

const panel = useSlideModal({ id: 'fast-panel', direction: 'left', animation: NO_ANIMATION, render: () => ... });
```

> See the **Getting Started** playground page for live "No Transition" examples for both modal types.

---

## useMessageModal

**Headless** message modal hook. Provides modal lifecycle and animation. The hook exports **no UI components** — users provide their own layout, title, footer, etc. in the `render` callback. Sizing constraints (min/max width, height) are user-land concerns — apply them to your content wrapper inside `render`.

> **Reference implementations:** For ready-made MUI components (`MessageModal.DefaultLayout`, `MessageModal.Title`, `MessageModal.Content`, `MessageModal.Header`, `MessageModal.Footer`, `MessageModal.Icon`), see `playground/src/entities/modal-template/ui/mui/message-modal/`. For `Shared.OverflowContainer`, see `playground/src/entities/modal-template/ui/mui/shared/content/OverflowContainer.tsx`. The `OverflowContainer` sets a `--scrollbar-width` CSS custom property and exposes two props:

- `sx` – base styles forwarded to the underlying `Box` (replaces the previous
  `slotProps` pattern). `maxHeight` defaults to `sizes.maxHeight` but can be
  overridden here.
- `overflowSx` – styles applied only when the container is overflowing. Use it
  for padding, background, etc.

These are **not** library exports — copy them into your project or write your own.

```typescript
import { useMessageModal } from 'umbra/react';
import { Button, Typography, Stack } from '@mui/material';

const modal = useMessageModal({
  id: 'confirm-delete',
  actions: state,
  render: ({ handle }) => (
    // Users provide their own layout — no library UI components
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="h6">Delete Item</Typography>
      <Typography>Are you sure?</Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <button {...state.cancel(() => handle.close('cancel'))}>Cancel</button>
        <button {...state.confirm(async () => {
          await api.deleteItem();
          handle.close('confirm');
        })}>Delete</button>
      </Stack>
    </Stack>
  ),
});

// Open and wait
await modal.open();
const [err, result] = await modal.waitForClose();
if (result?.reason === 'confirm') {
    /* confirmed */
}
```

---

## useSlideModal

**Headless** slide-in panel hook with direction-based animation and positioning. The hook exports **no UI components** — users provide their own layout in the `render` callback.

> **Reference implementations:** For ready-made MUI components (`SlideModal.DefaultLayout`, `SlideModal.Title`, `SlideModal.Content`), see `playground/src/entities/modal-template/ui/mui/slide-modal/`. These are **not** library exports — copy them into your project or write your own.

```typescript
import { useSlideModal } from 'umbra/react';
import { Box, Typography, Button } from '@mui/material';

const panel = useSlideModal({
  id: 'settings',
  direction: 'right',
  actions: state,
  render: ({ handle, direction }) => (
    // Users provide their own layout — no library UI components
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography>Panel content</Typography>
      </Box>
      <button {...state.save(() => handle.close('save'))}>Save</button>
    </Box>
  ),
});
```

### Options

| Option      | Type                                        | Description                                             |
| ----------- | ------------------------------------------- | ------------------------------------------------------- |
| `direction` | `'left' \| 'right' \| 'top' \| 'bottom'`    | Edge the panel slides in from. Required.                |
| `align?`    | `'stretch' \| 'start' \| 'center' \| 'end'` | Cross-axis alignment (see below). Default: `'stretch'`. |

Plus the shared template options (`id`, `render`, `actions`, `animation`, `dismissKey`, `dismissWhilePreparing`, `nonModal`, `portal`, `onOpen`, `onClose`, …).

### Cross-axis alignment (`align`)

The **cross axis** is perpendicular to the slide: vertical for `left`/`right`, horizontal for `top`/`bottom`.

- **`'stretch'` (default)** — fill the cross axis edge-to-edge: a classic full-height side drawer or full-width top/bottom sheet. Unchanged from previous versions.
- **`'start'` / `'center'` / `'end'`** — the panel is **content-sized** on the cross axis and pinned to that position (`start` = top/left, `end` = bottom/right). You must size the panel yourself in `render` — nothing stretches it.

```typescript
// Corner toast: slides in from the right, pinned to the top.
const toast = useSlideModal({
  id: 'toast',
  direction: 'right',
  align: 'start',
  nonModal: true,
  portal: true,
  render: () => <Box sx={{ width: 320, p: 2 }}>Saved.</Box>,
});

// Command palette: drops from the top, horizontally centered.
const palette = useSlideModal({
  id: 'palette',
  direction: 'top',
  align: 'center',
  render: () => <Box sx={{ width: 560, p: 2 }}>Search…</Box>,
});
```

Alignment is orthogonal to the slide, so it composes with every mode (modal, `nonModal`, `portal`, contained) — including the [contained mode](#non-modal-positioning-contained-vs-portal), where the panel aligns against its host container instead of the viewport.

---

## waitForClose

Go-style 2-element tuple return:

```typescript
const [err, result] = await modal.waitForClose();
// err: Error | null
// result: { reason: string; data?: TData } | null

if (err) {
  handleError(err);
  return;
}
if (result.reason === 'confirm') {
  console.log('Confirmed!', result.data);
}
```

---

## Content Helpers

> **Playground reference implementations only.** The `Content.*` components (`Content.Message`, `Content.Heading`, `Content.Detail`, `Content.Hint`, `Content.DetailList`, `Content.AlertContent`, `Content.Section`) are **not** exported from the library. They are available as reference implementations in `playground/src/entities/modal-template/ui/mui/shared/content/`. Copy them into your project or write your own typography/content components.

```tsx
// These are NOT library imports — copy from playground or write your own
// import { Content } from 'playground/src/entities/modal-template/ui/mui/shared/content';

// Simple helpers - accept children and optional sx prop
<Content.Message>Are you sure?</Content.Message>
<Content.Heading>Title</Content.Heading>
<Content.Detail>Detail text</Content.Detail>
<Content.Hint>Hint text</Content.Hint>

// Complex helpers - accept specific props
<Content.DetailList items={['item1', 'item2']} icon={<Icon />} />
<Content.AlertContent message="Error message" severity="error" />
<Content.Section title="Section Title">
  <Content.Message>Section content</Content.Message>
</Content.Section>
```

Since the library is headless, you can use any UI framework or plain HTML/CSS for your content. The above shows the playground's MUI-based reference components as an example.

---

## ModalOutlet

Wrap a subtree so that every `useModal` inside auto-registers its dialog — no `{modal.Modal}` in JSX required. `modal.Modal` becomes `null` inside an outlet; destructuring still works, it just renders nothing. Outlets are nestable: the nearest ancestor outlet wins.

```typescript
import { ModalOutlet, useModal } from 'umbra/react';

// Wrap your subtree once — any depth works
function App() {
  return (
    <ModalOutlet>
      <Dashboard />
    </ModalOutlet>
  );
}

// Inside the subtree — no {Modal} needed
function Dashboard() {
  const { open } = useModal({
    id: 'info',
    render: ({ handle }) => (
      <dialog>
        <button onClick={() => handle.close('done')}>Close</button>
      </dialog>
    ),
  });
  return <button onClick={() => { open(); }}>Open</button>;
}
```

| Prop       | Type        | Description                                                      |
| ---------- | ----------- | ---------------------------------------------------------------- |
| `children` | `ReactNode` | Subtree that can use `useModal` without placing `{Modal}` in JSX |

---

## Dialog Manager (Imperative)

```typescript
import { dialogManager } from 'umbra';

dialogManager.open('my-modal-id');
dialogManager.close('my-modal-id', 'confirm');
// Reason only — the registry is keyed by string, so nothing here knows a modal's `TData`.
// A typed payload goes through `handle.close(reason, data)` or an action's `close(data)`.

// Subscribe to lifecycle events
dialogManager.subscribe((event) => {
  // { type: 'open', id: string }           — fires after onOpen completes
  // { type: 'close', id: string, reason?: string } — reason from close() call
  console.log(event.type, event.id, event.type === 'close' ? event.reason : '');
});
```

### lookup — Query API

Overloaded method for querying modal state. No optional chaining needed — `lookup(id)` always returns a valid `ModalInfo` (null-object default for unregistered ids).

```typescript
// Per-modal query — always returns ModalInfo (never undefined)
const info = dialogManager.lookup('my-modal');
info.exists; // true if registered, false otherwise
info.isOpen; // true if phase !== 'closed'
info.isForeground; // true if topmost open modal
info.phase; // 'closed' | 'opening' | 'open' | 'closing'
info.openedAt; // timestamp (0 for unregistered)
info.modalType; // the label its creator gave it (only on the registered branch)
info.nonModal; // boolean (absent for unregistered)

// Collection-level queries
const all = dialogManager.lookup();
all.getOpen(); // ModalInfo[] — all open, sorted by open time (bottom first)
all.getOpen('blocking'); // ModalInfo[] — only showModal() dialogs
all.getOpen('non-blocking'); // ModalInfo[] — only dialog.show() dialogs
all.getClosed(); // ModalInfo[] — registered but closed
all.getForeground(); // ModalInfo | undefined
all.getRegisteredCount(); // total registered modals
all.get('my-modal'); // same as lookup('my-modal')
all.exists('my-modal'); // true if registered
all.isOpen('my-modal'); // true if open
all.isForeground('my-modal'); // true if topmost

// Counts and existence checks derive from the arrays:
all.getOpen().length; // open count
all.getOpen('blocking').length > 0; // any blocking dialog open?
all.getClosed().length; // closed count
```

### ModalInfo

A union discriminated by `exists`: `RegisteredModalInfo | UnregisteredModalInfo`.

| Property       | Type         | Description                                          |
| -------------- | ------------ | ---------------------------------------------------- |
| `id`           | `string`     | Modal identifier                                     |
| `exists`       | `boolean`    | Whether the modal is registered — the discriminant   |
| `phase`        | `ModalPhase` | `'closed'` \| `'opening'` \| `'open'` \| `'closing'` |
| `isOpen`       | `boolean`    | Whether `phase !== 'closed'`                         |
| `isForeground` | `boolean`    | Whether this is the topmost open modal               |
| `openedAt`     | `number`     | `Date.now()` at open start (0 if unregistered)       |

Registration-time facts live only on the `exists: true` branch, so reading one means narrowing
first — an unregistered modal has none:

| Property (registered only) | Type      | Description                                                                                                              |
| -------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| `modalType`                | `string`  | The label its creator gave it — `'modal'` by default, `'slide'` from `useSlideModal`, anything your own template reports |
| `nonModal`                 | `boolean` | Whether opened with `dialog.show()`                                                                                      |

```typescript
const info = dialogManager.lookup('my-modal');
if (info.exists) {
  info.modalType; // string — no `?? ''` needed
}
```

`getOpen()`, `getClosed()`, `getForeground()` and `openDialogs` can only ever return registered
modals, so they are typed `RegisteredModalInfo` and need no narrowing at all.

### ModalLookup

| Method                 | Returns                  | Description                                                           |
| ---------------------- | ------------------------ | --------------------------------------------------------------------- |
| `get(id)`              | `ModalInfo`              | Same as `lookup(id)` — null-object default for unregistered           |
| `exists(id)`           | `boolean`                | Whether the modal is registered                                       |
| `getForeground()`      | `ModalInfo \| undefined` | Topmost open modal, or undefined                                      |
| `getOpen(filter?)`     | `ModalInfo[]`            | Open modals sorted by open time; filter `'blocking'`/`'non-blocking'` |
| `isOpen(id)`           | `boolean`                | Whether a specific modal is open                                      |
| `isForeground(id)`     | `boolean`                | Whether a specific modal is topmost                                   |
| `getClosed()`          | `ModalInfo[]`            | All registered but closed modals                                      |
| `getRegisteredCount()` | `number`                 | Total registered modals                                               |

---

## DOM Lifecycle Events

`modal:open` and `modal:close` `CustomEvent`s are dispatched on `document` at key points in the modal lifecycle. Use these to integrate with external systems (analytics, feature flags, shell apps) without importing React or the dialog manager.

```typescript
import { MODAL_OPEN_EVENT, MODAL_CLOSE_EVENT } from 'umbra';
import type { ModalOpenEventDetail, ModalCloseEventDetail } from 'umbra';

document.addEventListener(MODAL_OPEN_EVENT, (e: Event) => {
  const { id, modalType, openedAt } = e.detail;
  analytics.track('modal_shown', { id, modalType, openedAt });
});

document.addEventListener(MODAL_CLOSE_EVENT, (e: Event) => {
  const { id, modalType, reason, openedAt } = e.detail;
  analytics.track('modal_hidden', {
    id,
    modalType,
    reason,
    durationMs: Date.now() - openedAt,
  });
});
```

### Event timing

| Event         | Fires when                                               |
| ------------- | -------------------------------------------------------- |
| `modal:open`  | Modal transitions `closed → opening` (start of sequence) |
| `modal:close` | Modal transitions `* → closed` (after closing animation) |

### Detail payloads

**`ModalOpenEventDetail`**

| Field       | Type     | Description                   |
| ----------- | -------- | ----------------------------- |
| `id`        | `string` | Modal id                      |
| `modalType` | `string` | The label its creator gave it |
| `openedAt`  | `number` | `Date.now()` at open start    |

**`ModalCloseEventDetail`**

| Field       | Type                  | Description                         |
| ----------- | --------------------- | ----------------------------------- |
| `id`        | `string`              | Modal id                            |
| `modalType` | `string`              | The label its creator gave it       |
| `reason`    | `string \| undefined` | Close reason                        |
| `openedAt`  | `number`              | `Date.now()` recorded at open start |

### modalType

A label the creator attaches, carried into `lookup()` and both DOM events. Any string, and
purely informational — nothing in the library reads it. It saves a cross-cutting listener
(analytics, a handler that only cares about drawers) from keeping its own id-to-kind table.

`useModal` and `useMessageModal` default to `'modal'`; `useSlideModal` reports `'slide'`. A
template you write should name itself rather than inherit the default — the core deliberately
does not enumerate the templates built on it.

---

## useDialogManager (Reactive)

Reactive hook for subscribing to dialog manager state changes. Returns a snapshot that updates whenever modals open, close, register, or unregister.

```typescript
import { useDialogManager } from 'umbra/react';

function ModalOverlay() {
  const { openDialogs, foreground } = useDialogManager();

  if (openDialogs.length === 0) return null;

  return (
    <div>
      <span>{openDialogs.length} modals open</span>
      {foreground && <span>Top: {foreground.id}</span>}
    </div>
  );
}
```

### DialogManagerSnapshot

| Property      | Type                     | Description                                                                    |
| ------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `openDialogs` | `readonly ModalInfo[]`   | Open modals (modal and nonModal), sorted by open time — index = stack position |
| `foreground`  | `ModalInfo \| undefined` | Most recently opened modal                                                     |

Everything else derives from `openDialogs`: counts via `.length`, blocking vs
non-blocking via `ModalInfo.nonModal` (`openDialogs.filter((d) => !d.nonModal)`),
and stack position via array index.

---

## useLookup (Reactive Per-Modal)

Reactive hook for querying a single modal's state. Returns `ModalInfo` that updates whenever any modal opens, closes, registers, or unregisters. Uses `useSyncExternalStore` for tear-free reads.

```typescript
import { useLookup } from 'umbra/react';

function ModalStatus({ id }: { id: string }) {
  const info = useLookup(id);

  if (!info.exists) return <span>Not registered</span>;
  return (
    <div>
      <span>{info.isOpen ? 'Open' : 'Closed'}</span>
      {info.isForeground && <span> (foreground)</span>}
    </div>
  );
}
```

Returns the same `ModalInfo` type as `dialogManager.lookup(id)`. For unregistered ids, returns the null-object default (`exists: false`, `phase: 'closed'`, etc.).

---

## Debug Logging

Every emitted line carries a monotonic `#0001`-style sequence id, shared across all namespaces — note the latest id, trigger the behavior you're investigating, then read every line above that id.

Activate via `localStorage` (persists across reloads) or the programmatic `setLogLevel` API:

```ts
// Via localStorage (persists across reloads):
localStorage.setItem('dialog:log', '*'); // all namespaces
localStorage.setItem('dialog:log', 'modal,action'); // specific namespaces
// Both short form ('modal') and prefixed form ('dialog:modal') are accepted.

// Programmatic API (session only by default):
import { setLogLevel } from 'umbra';
setLogLevel('*'); // enable all, session only
setLogLevel('modal,action'); // enable specific namespaces, session only
setLogLevel('modal', true); // enable and persist to localStorage
setLogLevel(false); // disable all
```

Namespace tokens — short form and `dialog:`-prefixed form are interchangeable:

| Namespace             | Description                                               |
| --------------------- | --------------------------------------------------------- |
| `manager`             | Modal registration & open/close lifecycle                 |
| `modal`               | `useModal` core — open/close requests                     |
| `modal:lifecycle`     | Opening phase & `onOpen` callback                         |
| `modal:keydown`       | Dismiss-key handling (`dismissKey`, default `Key.Escape`) |
| `modal:click-outside` | Click-outside detection for non-modal dialogs             |
| `outlet`              | ModalOutlet registration and rendering                    |
| `action`              | Modal actions; hotkey registration & hits                 |

### Privacy

Logging is **opt-in, debug-only, and console-only** — nothing is persisted or transmitted. It never logs the `data` payload passed to `close(data)` (only a `withData` flag), nor the close `result`, render content, or store state. It **does** log `error.message` from your `onOpen` / `onClose` / action callbacks and the close `reason`, either of which can carry user data if your code puts it there. Avoid enabling logging in **production**, where a session-replay / RUM tool may capture `console` output.

---

## formatHotkeyLabel

Convert a `HotkeyDef` to a human-readable label suitable for UI display (e.g. tooltip or `aria-keyshortcuts`).

```typescript
import { formatHotkeyLabel } from 'umbra';

formatHotkeyLabel('Ctrl+Enter'); // → 'Ctrl+Enter'
formatHotkeyLabel('Escape'); // → 'Escape'
formatHotkeyLabel('Ctrl+Shift+Delete'); // → 'Ctrl+Shift+Delete'
```

---

## normalizeError

Convert an `unknown` caught value to an `Error` instance. Useful in action handlers when you need a guaranteed `Error` from a `catch` block.

```typescript
import { normalizeError } from 'umbra';

try {
  await riskyOperation();
} catch (e) {
  const err = normalizeError(e); // always an Error
  setError(err.message);
}
```

---

## createStore

Reactive store factory — a hand-rolled reactive cell with **zero runtime dependencies**. State and behavior are declared together in a single closure — no classes, no dispatch, no action types.

```typescript
// Generic store — built-in mutators exposed on the instance
createStore<TSnapshot, TContext>(
  initialSnapshot: TSnapshot,
  options?: CreateStoreOptions<TSnapshot, TContext>,
): GenericStore<TSnapshot, TContext>

// Domain store — only your builder's methods are exposed
createStore<TSnapshot, TMethods, TContext>(
  initialSnapshot: TSnapshot,
  builder: (api: StoreApi<TSnapshot, TContext>) => TMethods,
  options?: CreateStoreOptions<TSnapshot, TContext>,
): Store<TSnapshot, TMethods, TContext>
```

**Two modes.** A **generic** store (no builder) exposes `set`/`reset` directly — a plain reactive cell. A **domain** store (with a builder) exposes _only_ the methods the builder returns, merged flat at the root (`store.load()`), zustand-style; the built-in mutators are reachable only through the builder's `api`. Want `reset` on the instance? Define one: `reset() { api.reset(); }`. There are no reserved keys — the store contract (`subscribe`/`getSnapshot`) simply wins on a name clash.

### `CreateStoreOptions`

| Option    | Type                                      | Default     | Description                                                                                                                        |
| --------- | ----------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `equals`  | `(a: TSnapshot, b: TSnapshot) => boolean` | `Object.is` | Equality function for `set()` and `reset()`. When equal, the commit and notification are skipped.                                  |
| `context` | `TContext`                                | —           | Dependencies the builder's methods read via `getContext()`. Domain form only — a builderless store has nothing that could read it. |

### POJO contract

The **snapshot** (state) is a plain object (POJO). `set`/`reset` replace it wholesale; there is no draft engine, so nested updates spread manually or compose immer at the call site (`set(s => produce(s, recipe))`).

**Methods are not state.** The builder returns domain behavior that lives on the store instance but is never cloned, serialized, or compared. Only the snapshot participates in React subscriptions. Non-snapshot mutable state (resolver lists, RAF ids, handler registries) lives as closure variables inside the builder.

```typescript
import { createStore } from 'umbra/react';

// Module-level — lives outside React
const formStore = createStore(
  { name: '', email: '', errors: {} as Record<string, string> },
  ({ get, set }) => ({
    setValue(key: string, value: string) {
      set((s) => {
        const { [key]: _removed, ...errors } = s.errors;
        return { ...s, [key]: value, errors };
      });
    },
    validate() {
      const s = get();
      const errors: Record<string, string> = {};
      if (!s.name) errors.name = 'Required';
      if (!s.email) errors.email = 'Required';
      set((prev) => ({ ...prev, errors }));
      return Object.keys(errors).length === 0;
    },
    reset() {
      set({ name: '', email: '', errors: {} });
    },
  })
);
```

### StoreApi

The object passed to the builder:

| Method         | Type                                                                | Description                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get()`        | `() => TSnapshot`                                                   | Read the current snapshot                                                                                                                                                                                                                         |
| `set()`        | `(next: TSnapshot \| (prev: TSnapshot) => TSnapshot) => void`       | Replace the snapshot and notify listeners. Skips when `equals` holds. Return the same reference from the updater to make a no-op free                                                                                                             |
| `reset()`      | `(next?: TSnapshot \| ((initial: TSnapshot) => TSnapshot)) => void` | Restore a clean baseline and commit it. Three forms: bare `reset()` restores the initial snapshot; `reset(newSnapshot)` commits the value and makes it the new baseline; `reset(updater)` receives the current baseline and returns the next one. |
| `getContext()` | `() => TContext`                                                    | Read the context injected at construction (`{ context }`)                                                                                                                                                                                         |

### Store (return type)

| Property      | Type                                   | Description                                                                       |
| ------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| `subscribe`   | `(listener: () => void) => () => void` | `useSyncExternalStore`-compatible subscribe                                       |
| `getSnapshot` | `() => TSnapshot`                      | `useSyncExternalStore`-compatible snapshot accessor                               |
| `...methods`  | (from builder)                         | Domain methods merged flat onto the store — **domain stores expose nothing else** |

A **generic** store (no builder) additionally exposes `set` and `reset` directly on the instance (`GenericStore`).

### Context

Inject stable dependencies (API clients, refs, callbacks) into store methods without making them part of the snapshot.

```typescript
type Ctx = { apiClient: ApiClient };

const formStore = createStore(
  { name: '', saving: false },
  ({ get, update, getContext }: StoreApi<{ name: string; saving: boolean }, Ctx>) => ({
    async save() {
      const { apiClient } = getContext();
      update((d) => {
        d.saving = true;
      });
      await apiClient.save(get());
      update((d) => {
        d.saving = false;
      });
    },
  })
);

// Bound where the store is built — the only place it is bound, and pure.
const boundStore = createStore(initial, builder, { context: { apiClient } });
await boundStore.save();
```

`useStore` cannot inject context: it only reads. Writing to a shared store during render is a
mutation React may run twice, discard, or interleave, and two components injecting different
values would be last-render-wins. To scope a store _and_ its dependencies to a subtree, build it
per provider with `createStoreContext(() => createStore(initial, builder, { context }))`.

---

## Reading a store

The library ships the engine, not the conveniences over it. `StoreContract` — the
`{ subscribe, getSnapshot }` pair every store satisfies — is exactly what React's own
`useSyncExternalStore` consumes, so no adapter is needed:

```tsx
import { useSyncExternalStore } from 'react';

const count = useSyncExternalStore(store.subscribe, () => store.getSnapshot().count);
```

`useStore` (selectors and custom equality), `createStoreContext` (a store scoped to a subtree),
`watch` (observing outside React) and `shallowEqual` used to ship from here. They had no caller
inside the library, and a dialog manager is not where anyone looks for state management — so
they live in `playground/src/shared/lib/` now, as reference code to copy, on the same terms as
the modal templates. The playground's examples run on those copies.
