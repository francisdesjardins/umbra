# umbra - API Reference

> **Maintenance**: This file is handwritten and must be kept in sync with the library source
> manually — nothing type-checks the snippets below. The playground's `/api` route is the
> _generated_ reference (typedoc over the real entry points, rebuilt whenever `src/` changes); it
> cannot drift, so when the two disagree it wins. This page is the narrative one: entry points,
> the shape of the design, and the parts that need prose rather than a signature.

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
3. **Actions** — declared by being rendered: `action('save', handler)` inside `render` returns DOM props (`{ onClick, disabled, 'data-loading', … }`) to spread. For custom state, use `createStore` alongside.
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
  onClose: (result) => {
    report(result.reason); // 'confirm' | 'cancel' | 'dismiss'
  },
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

| Option        | Type                         | Description                                                                |
| ------------- | ---------------------------- | -------------------------------------------------------------------------- |
| `onAction`    | `(close) => void \| Promise` | What the action does. Omit to auto-close with the reason                   |
| `onClick`     | `(event) => void`            | Runs **first**; call `preventDefault()` to veto the action                 |
| `disabled`    | `boolean`                    | **Or**-ed with the action's own reasons — it can add one, never remove one |
| `type`        | `'button' \| 'submit'`       | Default `'button'`, so a spread is safe inside a `<form>`                  |
| `hotkey`      | `HotkeyDef`                  | Keyboard shortcut, dispatched by clicking the button                       |
| `focusOnOpen` | `boolean`                    | Take the modal's opening focus instead of the first focusable element      |

Returned props: `{ type, onClick, 'data-loading', disabled, 'aria-busy', 'aria-keyshortcuts'?, 'data-focus-on-open'? }`.
`data-loading` is this action alone; `disabled` is true while **any** action runs, which is what
stops a double click submitting twice.

#### Every field is a DOM prop, on purpose

The set spreads onto a bare `<button>`, onto a component library's button, and onto your own —
because it never guesses what your buttons are called or what props they take. A core that is
agnostic of the UI put into it cannot ship a prop named for one family of component libraries:
MUI and Mantine call the busy flag `loading`, another design system calls it `busy` or `pending`,
and a headless one has no such prop at all and wants you to render the spinner yourself.

```tsx
// A bare button. The hotkey and the opening focus are wired by the spread alone.
<button {...action('ok', { hotkey: Key.Enter, focusOnOpen: true })}>OK</button>
```

So the running state travels as an attribute. CSS reaches it directly with
`button[data-loading='true'] { … }`, and a wrapper reads it as a boolean and maps it to whatever
_its_ system calls that — one line, in the only place that knows the answer:

```tsx
function Button({ loading, ...props }: ButtonProps) {
  const busy = loading ?? props['data-loading'] ?? false;
  return <MuiButton loading={busy} disabled={busy} {...props} />;
}
```

### Opening focus

`showModal()` focuses the first thing it can find, which for a form is its first input — rarely
what a confirmation dialog wants, and never what a destructive one wants. `focusOnOpen` moves the
starting point to the button you meant to offer:

```tsx
render: ({ action }) => (
  <>
    <input name="reason" />
    <button {...action('cancel', { focusOnOpen: true })}>Cancel</button>
    <button {...action('delete', { hotkey: Key.Enter, onAction: remove })}>Delete</button>
  </>
);
```

Two buttons declaring it is a contradiction the DOM cannot express — the first one rendered wins.

It decides where the modal **opens**. Where focus returns after a failed action is a separate
question: the modal puts it back on the button that ran the action, because that is where the
retry is — tab to a second action, run it, and you stay there rather than being sent back. This
option is the fallback for when nothing inside the dialog held focus at all.

The prop is `data-focus-on-open`, not React's `autoFocus`: React does not put the native
`autofocus` attribute in the DOM, and `showModal()`'s focusing steps read exactly that attribute,
so the modal applies the focus itself once the dialog is open.

> **Custom button wrappers must forward it**, the same way they must forward
> `aria-keyshortcuts` — a wrapper that spreads `...rest` onto its `<button>` already does.

### Aggregated state

`render` also receives `hasRunningAction` and `error` — the combined state of every action on the
modal — and the hook returns them too, for a trigger button outside the dialog.

Three flags describe "busy" at three scopes, and each is named for its own: an action's
`data-loading` is that button, `hasRunningAction` is the whole modal, and `isPreparing` is the
`prepare` callback, which has nothing to do with actions at all.

```tsx
const modal = useModal({
  id: 'save',
  render: ({ action, hasRunningAction, error }) => (
    <>
      <button {...action('save', save)} />
      {error ? <p role="alert">{error.message}</p> : null}
    </>
  ),
});

modal.hasRunningAction; // same value, outside render
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
clicking it, so the key path and the click path are the same path — running state, `disabled`
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

### Presets: say it once, in a wrapper

A confirm dialog has the same two reasons every time, and restating
`useMessageModal<void, 'confirm' | 'cancel'>` at each call site is the kind of repetition that
eventually disagrees with itself. Close them once in your own hook — the library is designed to be
wrapped, and this is the seam:

```tsx
type ConfirmReason = 'confirm' | 'cancel';

export const useConfirmModal = <TData = void,>(
  options: UseMessageModalOptions<TData, ConfirmReason>
): UseMessageModalReturn<TData, ConfirmReason> => {
  return useMessageModal<TData, ConfirmReason>(options);
};
```

Call sites keep everything the declaration buys and spend no type argument on the common case:

```tsx
const modal = useConfirmModal({ id: 'delete', render, onClose }); // no payload, no `<void, …>`
const user = useConfirmModal<User>({ id: 'create-user', render, onClose }); // the one argument is the payload
```

`action('confrim')` is still rejected through the wrapper, and the `switch` in `onClose` is still
exhaustive over `'confirm' | 'cancel' | 'dismiss'`. The same shape gives a template its own preset
— pin `direction` and `align` on a `useDrawer` over `useSlideModal`, for instance.

---

## useModal (Base Primitive)

```tsx
import { useModal } from 'umbra/react';

const modal = useModal<void, 'confirm' | 'cancel'>({
  id: 'my-modal',
  ariaLabel: 'Confirm removal',
  render: ({ isPreparing, handle, action, error }) => (
    <div>
      {isPreparing ? <p>Loading…</p> : <p>Content</p>}
      <button {...action('cancel')}>Cancel</button>
      <button
        {...action('confirm', async (close) => {
          await doSomething();
          close();
        })}
      >
        Confirm
      </button>
      {error ? <p role="alert">{error.message}</p> : null}
    </div>
  ),
  onClose: (result) => {
    report(result.reason); // 'confirm' | 'cancel' | 'dismiss'
  },
});

// Returns — the render args, plus the hook's own surface
const { open, openAndWait, isVisible, Modal, dialogManager } = modal;
const { isPreparing, handle, action, hasRunningAction, error } = modal;
```

### Render Args

`ModalRenderArgs` — what `render` is handed. The hook's return **intersects** it, so every field
below is also readable outside `render` (`modal.hasRunningAction` on a trigger button, for instance).

| Property           | Type                          | Description                                                                |
| ------------------ | ----------------------------- | -------------------------------------------------------------------------- |
| `isPreparing`      | `boolean`                     | Whether the `prepare` callback is still running — a second axis to `phase` |
| `handle`           | `ModalHandle<TData, TReason>` | `{ close(reason?, data?: TData) }`                                         |
| `action`           | `ActionFactory<TData>`        | Declare an action and get its button props — see [Actions](#actions)       |
| `hasRunningAction` | `boolean`                     | True while **any** action on this modal is running                         |
| `error`            | `Error \| null`               | The last error thrown by any action on this modal                          |

### Return

Everything above, plus:

| Property        | Type                          | Description                                                                                |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `open`          | `() => Promise<void>`         | Resolves after `prepare` completes; joins an in-flight open, never hangs                   |
| `openAndWait`   | `() => Promise<AwaitedClose>` | Open **and** await the close — Go-style `[error, result]`, see [openAndWait](#openandwait) |
| `isVisible`     | `boolean`                     | On screen — `phase !== 'closed'`, so still true through the exit animation                 |
| `Modal`         | `ReactNode`                   | Place in JSX as `{Modal}`; `null` when closed, and inside a `ModalOutlet`                  |
| `dialogManager` | `DialogManager`               | The instance this modal registered with — use it over the static singleton                 |

### Options

| Option                    | Type                                                             | Description                                                                                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | `string`                                                         | Unique modal identifier                                                                                                                                                                                                                                  |
| `render`                  | `(args: ModalRenderArgs<TData, TReason>) => ReactNode`           | Render function                                                                                                                                                                                                                                          |
| `onKeyDown?`              | `(event: KeyboardEvent) => void`                                 | Escape hatch; runs before the action hotkeys the modal dispatches                                                                                                                                                                                        |
| `animation?`              | `ModalAnimation`                                                 | CSS transition config                                                                                                                                                                                                                                    |
| `style?`                  | `CSSProperties`                                                  | Structural styles for the `<dialog>` box itself — the library places a dialog but never sizes it. Styles for what is _inside_ belong in `render`.                                                                                                        |
| `prepare?`                | `(signal: AbortSignal) => void \| Promise<void>`                 | Called as the modal opens, alongside the entrance animation; `isPreparing` stays true until it settles. The signal aborts when the modal closes — a `() => …` callback stays assignable, so ignoring it costs nothing.                                   |
| `onClose?`                | `(result: CloseResult<TData, TReason>) => void \| Promise<void>` | Called on close                                                                                                                                                                                                                                          |
| `ariaLabel?`              | `string`                                                         | The dialog's accessible name. Omitted entirely when absent — a dialog with no name is announced as just "dialog", and `aria-label=""` would hide that from an audit.                                                                                     |
| `ariaLabelledBy?`         | `string`                                                         | Id of the element naming the dialog — usually its own heading. Takes precedence over `ariaLabel`; prefer it when the name is already on screen.                                                                                                          |
| `ariaDescribedBy?`        | `string`                                                         | Id of the element describing the dialog — usually its body text.                                                                                                                                                                                         |
| `role?`                   | `'dialog' \| 'alertdialog'`                                      | `'alertdialog'` for a dialog that interrupts to report something the user must act on. Default: `'dialog'`.                                                                                                                                              |
| `modalType?`              | `string`                                                         | The label this modal reports to `lookup()` and the DOM events — see [modalType](#modaltype). Default: `'modal'`.                                                                                                                                         |
| `dismissKey?`             | `HotkeyDef \| false`                                             | Key that dismisses the modal. Default: `Key.Escape`. Pass `false` to disable key dismissal. When an action hotkey matches `dismissKey`, the action takes priority automatically.                                                                         |
| `dismissOnBackdropClick?` | `boolean`                                                        | Whether a backdrop click dismisses the modal. Not applicable when `nonModal: true`. Defaults to `false` when the render pass **drew** any actions (a modal offering buttons wants to be dismissed through one) and `true` when it drew none.             |
| `dismissOnClickOutside?`  | `boolean`                                                        | Whether clicking outside the dialog dismisses it. Only applicable when `nonModal: true`. Suppressed while an action runs and, unless `dismissWhilePreparing`, while `prepare` is preparing. Only the topmost non-modal responds. Default: `false`.       |
| `dismissWhilePreparing?`  | `boolean`                                                        | Whether the dismiss key, backdrop click, and click-outside can close the modal while `prepare` is executing. Default: `true`.                                                                                                                            |
| `nonModal?`               | `boolean`                                                        | Use `dialog.show()` instead of `showModal()` (see below)                                                                                                                                                                                                 |
| `portal?`                 | `boolean`                                                        | Render via `createPortal(node, document.body)`. Default: `false`. For non-modal dialogs, `true` = viewport-anchored (`fixed`); `false` = contained (anchored to its host — see below). Modal dialogs (top layer) are unaffected by ancestors either way. |

`nonModal` / `dismissOnBackdropClick` / `dismissOnClickOutside` form the `ModalVariant` union, not
three independent flags: a non-modal dialog has no backdrop to click, so passing
`dismissOnBackdropClick` alongside `nonModal: true` is a **type error** rather than a silently
ignored prop, and the reverse holds for `dismissOnClickOutside`.

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

## dialogPlacement

That whole table, as data. `useModal` renders the `host` styles on its wrapper and merges the
`dialog` half into the `<dialog>`, so a second binding — or a host you write by hand, outside
React — positions a dialog identically instead of re-deriving the rules.

```typescript
import { dialogPlacement } from 'umbra';

const { host, dialog } = dialogPlacement({ nonModal: true, portal: false });
// host   → CSSProperties for the wrapper the dialog is positioned against, or `null`
// dialog → CSSProperties for the <dialog> itself (here: `position: 'absolute'`)
```

| Option      | Type      | Description                                                                                      |
| ----------- | --------- | ------------------------------------------------------------------------------------------------ |
| `nonModal?` | `boolean` | `dialog.show()` rather than `showModal()` — no backdrop, no top layer                            |
| `portal?`   | `boolean` | Rendered into `document.body` rather than inline                                                 |
| `clip?`     | `boolean` | Clip the host, for an animation that slides the dialog past its edge (what `useSlideModal` sets) |

`host` is `null` when there is nothing to host — a top-layer dialog and a viewport-anchored one
both answer to the viewport. When it is **not** null the dialog must be rendered inside an element
carrying those styles, and that element must have a size: the dialog fills it.

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

const modal = useMessageModal<void, 'confirm' | 'cancel'>({
  id: 'confirm-delete',
  ariaLabelledBy: 'confirm-delete-title',
  render: ({ action }) => (
    // Users provide their own layout — no library UI components
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography id="confirm-delete-title" variant="h6">Delete Item</Typography>
      <Typography>Are you sure?</Typography>
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <button {...action('cancel')}>Cancel</button>
        <button {...action('confirm', async (close) => {
          await api.deleteItem();
          close();
        })}>Delete</button>
      </Stack>
    </Stack>
  ),
});

// Open and wait
const [err, result] = await modal.openAndWait();
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

const panel = useSlideModal<void, 'save'>({
  id: 'settings',
  direction: 'right',
  ariaLabel: 'Settings',
  render: ({ action, direction }) => (
    // Users provide their own layout — no library UI components
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Settings ({direction})</Typography>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Typography>Panel content</Typography>
      </Box>
      <button {...action('save', { hotkey: Key.Enter, onAction: save })}>Save</button>
    </Box>
  ),
});
```

### Options

| Option      | Type                                        | Description                                             |
| ----------- | ------------------------------------------- | ------------------------------------------------------- |
| `direction` | `'left' \| 'right' \| 'top' \| 'bottom'`    | Edge the panel slides in from. Required.                |
| `align?`    | `'stretch' \| 'start' \| 'center' \| 'end'` | Cross-axis alignment (see below). Default: `'stretch'`. |

Plus the shared template options — every `useModal` option except the two a template owns
(`modalType`, since a template names itself, and the internal `clipContainer`): `id`, `render`,
`animation`, `style`, `dismissKey`, `dismissWhilePreparing`, `nonModal`, `portal`, `prepare`,
`onClose`, `onKeyDown`, `ariaLabel`, `ariaLabelledBy`, `ariaDescribedBy`, `role`. The exclusion is
stated that way round in the source, so a new core option reaches every template by default.

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

## openAndWait

Go-style 2-element tuple return:

```typescript
const [err, result] = await modal.openAndWait();
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

**One call, and no order to get wrong.** A close resolver answers the **next** close — a previous
one is not replayed, because a stale reason is a wrong answer rather than a late one — so it has
to be registered before anything can close. `prepare` is what opens that window: a modal dismissed
while it runs closes _inside_ the open, and a resolver added afterwards waits forever, silently.
`openAndWait` registers first, which is why the store's `addCloseResolver` is internal: there is
no second call for a caller to sequence by hand, and so no order to get wrong.

To observe a close you are **not** causing, use `onClose` — a callback, with no ordering question.
To await a dialog you do not own, `dialogManager.requestOpenAndWait` carries the close on its
accepted branch.

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

// Inside the subtree — no {Modal} needed.
// `render` returns the dialog's *content*: the library owns the <dialog> element itself.
function Dashboard() {
  const { open } = useModal<void, 'done'>({
    id: 'info',
    ariaLabel: 'Details',
    render: ({ handle }) => (
      <div>
        <button onClick={() => handle.close('done')}>Close</button>
      </div>
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
  // { type: 'open', id: string }           — fires once open and `prepare` has settled
  // { type: 'close', id: string, reason?: string } — after the closing sequence completes
  console.log(event.type, event.id, event.type === 'close' ? event.reason : '');
});
```

### createOpenRequest

The envelope, built rather than typed out:

```typescript
import { createOpenRequest, dialogManager } from 'umbra';

dialogManager.requestOpen(
  'patient:merge',
  createOpenRequest({ patientId: '42' }, { source: 'portal:nav' })
);

// No payload — just say who is asking.
dialogManager.requestOpen('help', createOpenRequest(undefined, { source: 'shell:menu' }));
```

`requestOpen(id, { payload, context })` works and always will. The builder exists because this
call site is a **boundary**: the keys have to be remembered exactly (this payload was called
`data` until it collided with the one a modal declares), the two halves mean different things, and
this is the single place a protocol would grow — a version, a correlation id — without every
caller being edited. It validates nothing and cannot: the payload is `unknown` on the way out, and
the dialog receiving it is the only side that knows what a good one looks like.

### requestOpen vs requestOpenAndWait

`requestOpen` tells the owner and walks away. Across an ownership boundary that is usually not
enough: a caller refused and never told why cannot say anything to its user.

```typescript
const outcome = await dialogManager.requestOpenAndWait(
  'billing:confirm',
  createOpenRequest({ amount: 900 }, { source: 'checkout' })
);

if (!outcome.accepted) {
  // 'not-registered' · 'accepts-none' · or whatever the handler passed to `refuse`
  report(`declined: ${outcome.reason}`);
} else {
  const [err, result] = await outcome.closed; // opt-in second half
}
```

The owner answers through the envelope:

```typescript
useModal({
  id: 'billing:confirm',
  onOpenRequest: (payload, request) => {
    // The payload crossed a boundary, so it is `unknown` until this side says otherwise.
    const amount = typeof payload === 'object' && payload !== null ? payload.amount : null;
    if (typeof amount !== 'number' || amount > LIMIT) {
      return request.refuse('over-limit');
    }
    void open();
  },
});
```

**Refusal is explicit, acceptance is the default.** A handler that opens the dialog says yes by
doing so, and the manager never observes the dialog to find out — it cannot, because the React
binding's open is asynchronous, so a phase read when the handler returns would report a
successful accept as a refusal. The handler may be `async`, and `requestOpenAndWait` awaits it.

Two lifetimes, deliberately separate: the decision settles in milliseconds and the close settles
when the user is done, so the decision _carries_ the close instead of being folded into it.

### createDialogManager / DialogManagerProvider

`dialogManager` is a module-level singleton built by `createDialogManager()`, which is exported
too: call it for an **isolated** instance — a test, a second app on the page, a shell that must
not share a stack with what it embeds.

```tsx
import { createDialogManager } from 'umbra';
import { DialogManagerProvider, useDialogManager } from 'umbra/react';

const dm = createDialogManager(); // its own registry, stack and scroll-lock claim

// In React, the provider builds its own instance for the subtree — it takes only `children`.
// Every hook inside resolves to it instead of the singleton; without a provider they fall back
// to the singleton, which is the ordinary case.
<DialogManagerProvider>
  <App />
</DialogManagerProvider>;
```

A modal already knows which instance it belongs to: `useModal` returns it as `dialogManager`, and
that is what cross-modal calls inside a provider should use rather than the imported singleton.

### lookup — Query API

Overloaded method for querying modal state. No optional chaining needed — `lookup(id)` always returns a valid `ModalInfo` (null-object default for unregistered ids).

```typescript
// Per-modal query — always returns ModalInfo (never undefined)
const info = dialogManager.lookup('my-modal');
info.exists; // true if registered, false otherwise
info.isVisible; // true if phase !== 'closed'
info.isForeground; // true if topmost open modal
info.phase; // 'closed' | 'opening' | 'open' | 'closing'
info.isPreparing; // true while its prepare is still running
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
all.isVisible('my-modal'); // true if open
all.isForeground('my-modal'); // true if topmost

// Counts and existence checks derive from the arrays:
all.getOpen().length; // open count
all.getOpen('blocking').length > 0; // any blocking dialog open?
all.getClosed().length; // closed count
```

### ModalInfo

A union discriminated by `exists`: `RegisteredModalInfo | UnregisteredModalInfo`.

| Property       | Type         | Description                                               |
| -------------- | ------------ | --------------------------------------------------------- |
| `id`           | `string`     | Modal identifier                                          |
| `exists`       | `boolean`    | Whether the modal is registered — the discriminant        |
| `phase`        | `ModalPhase` | `'closed'` \| `'opening'` \| `'open'` \| `'closing'`      |
| `isVisible`    | `boolean`    | On screen, exit animation included (`phase !== 'closed'`) |
| `isPreparing`  | `boolean`    | Whether its `prepare` is still running (see below)        |
| `isForeground` | `boolean`    | Whether this is the topmost open modal                    |
| `openedAt`     | `number`     | `Date.now()` at open start (0 if unregistered)            |

`isPreparing` is the field an observer usually wants. `phase` describes the `<dialog>` element and
reaches `'open'` on the animation frame after it is shown, so `'opening'` lasts a single frame no
matter how long the modal takes to prepare — asking `phase` "is it ready yet" always answers yes. A
modal that loads something sits at `phase: 'open'` with `isPreparing: true` for as long as the load
takes.

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
| `isVisible(id)`        | `boolean`                | Whether a specific dialog is on screen                                |
| `isForeground(id)`     | `boolean`                | Whether a specific modal is topmost                                   |
| `getClosed()`          | `ModalInfo[]`            | All registered but closed modals                                      |
| `getRegisteredCount()` | `number`                 | Total registered modals                                               |

---

## DOM Lifecycle Events

`modal:open` and `modal:close` `CustomEvent`s are dispatched on `document` at key points in the
modal lifecycle.

**They are not a second `subscribe`.** `dialogManager.subscribe` reports the same two moments and
is the better tool inside one app: same information, no global names, no `document`. What these
add is reach — they are dispatched on the document, so a listener hears every dialog on the page,
including ones raised by a **different copy of this library** in another bundle or another
microfrontend. That is the observation half of what `requestOpen` opens on the way in: a shell can
ask a dialog it does not own to open, and watch what came of it, without either side sharing a
module instance. A tag manager or a plain `<script>` can listen too, having imported nothing.

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

`useModal` defaults to `'modal'`; the built-in templates name themselves — `useMessageModal`
reports `'message'` and `useSlideModal` `'slide'`. A
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
      <span>{info.isVisible ? 'Open' : 'Closed'}</span>
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
| `modal:lifecycle`     | Opening phase & `prepare` callback                        |
| `modal:keydown`       | Dismiss-key handling (`dismissKey`, default `Key.Escape`) |
| `modal:click-outside` | Click-outside detection for non-modal dialogs             |
| `outlet`              | ModalOutlet registration and rendering                    |
| `action`              | Modal actions; hotkey registration & hits                 |

### Privacy

Logging is **opt-in, debug-only, and console-only** — nothing is persisted or transmitted. It never logs the `data` payload passed to `close(data)` (only a `withData` flag), nor the close `result`, render content, or store state. It **does** log `error.message` from your `prepare` / `onClose` / action callbacks and the close `reason`, either of which can carry user data if your code puts it there. Avoid enabling logging in **production**, where a session-replay / RUM tool may capture `console` output.

---

## Key, formatHotkeyLabel, matchesHotkey

A `HotkeyDef` is a string: a key, optionally prefixed with modifiers (`'Enter'`, `'Ctrl+Enter'`,
`'Ctrl+Shift+Delete'`). `Key` is the const object of key names — `Key.Enter`, `Key.Escape`,
`Key.S` — and `KeyValue` is the union of its values.

```typescript
import { Key, formatHotkeyLabel, matchesHotkey } from 'umbra';

formatHotkeyLabel('Ctrl+Enter'); // → 'Ctrl+Enter'
formatHotkeyLabel('Shift+s'); // → 'Shift+S' — the canonical form, and what reaches the DOM

// The same matcher the modal uses, for a keydown of your own.
element.addEventListener('keydown', (event) => {
  if (matchesHotkey(event, Key.Escape)) {
    dismiss();
  }
});
```

**Letter case is not significant.** `Key.S` is `'s'` — what `KeyboardEvent.key` reports without
Shift — but the browser reports `'S'` while Shift is held, so single-character keys are compared
case-insensitively and the modifier list does the discriminating. `'Shift+s'` and `'Shift+S'` are
one hotkey, and CapsLock cannot change which one fires.

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
type Form = { name: string; saving: boolean };
type Ctx = { apiClient: ApiClient };

const initial: Form = { name: '', saving: false };

// Bound where the store is built — the only place it is bound, and pure.
const boundStore = createStore(
  initial,
  ({ get, set, getContext }: StoreApi<Form, Ctx>) => ({
    async save() {
      const { apiClient } = getContext();
      set((s) => ({ ...s, saving: true }));
      await apiClient.save(get());
      set((s) => ({ ...s, saving: false }));
    },
  }),
  { context: { apiClient } }
);
await boundStore.save();
```

There is no draft engine: `set` replaces the snapshot, so a nested update spreads by hand or
composes immer at the call site (`set((s) => produce(s, recipe))`).

**Context is injected where the store is built, and nowhere else.** Reading a store never writes
to it, and there is deliberately no way to hand it a dependency from inside a component: that
would be a mutation of shared state during a render React may run twice, discard or interleave,
and two components injecting different values would be last-render-wins. To scope a store _and_
its dependencies to a subtree, build one per provider — `createStore(initial, builder, { context })`
inside the provider's factory. The playground keeps a `createStoreContext` helper doing exactly
that, as code to copy rather than API to import.

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
