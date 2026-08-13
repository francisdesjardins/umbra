# umbra - API Reference

> **Maintenance**: This file is handwritten and must be kept in sync with the library source
> manually — nothing type-checks the snippets below. The playground's `/api` route is the
> _generated_ reference (typedoc over the real entry points, rebuilt whenever `src/` changes); it
> cannot drift, so when the two disagree it wins. This page is the narrative one: entry points,
> the shape of the design, and the parts that need prose rather than a signature.

## Architecture Overview

**Headless** dialog/modal management library built on a **primitive + template** layered design. The library exports no UI components — users bring their own.

### Entry points

Four specifiers, and which one a snippet uses is not cosmetic:

- **`umbra`** — the framework-agnostic core. The manager, the store engine, the placement table,
  `normalizeError`, `Key`. Resolves with no framework installed at all.
- **`umbra/react`** — the React binding (all hooks, `ModalOutlet`), **plus a wholesale re-export
  of the root**. A React app imports everything from here and never touches the root.
- **`umbra/solid`** — the same surface for Solid, plus `fromStore`, and the same wholesale
  re-export. See [umbra/solid](#umbrasolid) for the three differences, all of them the
  renderer's.
- **`umbra/vanilla`** — a _controller_ for a `<dialog>` you wrote yourself. No `render`, no
  `Modal`, no outlet, and no framework. See [umbra/vanilla](#umbravanilla).

**The body of this page is written against `umbra/react`,** because the two hook bindings share a
surface deliberately — down to the option names and the render-arg fields — so a Solid reader can
read every section below as their own and consult the Solid chapter only for what differs. The
vanilla chapter is the one that cannot be read that way: it does not render, so `render`, `Modal`
and the outlet have no counterpart there and it documents its own surface in full.

A snippet using only core symbols is shown on the root deliberately, to mark it as usable from
code with no renderer. Binding consumers may read every `umbra` import below as their own
specifier if they prefer a single import path.

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

### Per-action state: `action.isRunning(reason)`

The aggregate says _that_ an action is running. This says **which**:

```tsx
render: ({ action }) => (
  <>
    <header>{action.isRunning('publish') ? 'Publishing…' : 'Ready'}</header>
    {/* Not an action's button, and locked for one action rather than for any. */}
    <textarea disabled={action.isRunning('publish')} />

    <button {...action('draft', saveDraft)}>Save draft</button>
    <button {...action('publish', publish)}>Publish</button>
  </>
);
```

`data-loading` is this same fact **on** the button, and until now it was the only form of it —
anything not spreading the action's props had `hasRunningAction` and no way to tell two waits
apart. It hangs on the factory rather than joining the render args because the argument already
says whose state is being asked for, which is why `ActionState.isRunning` is one word and the
aggregate has to spell out its scope.

Asking never declares — only calling the factory does. It takes `ActionReason<TReason>`, the
same union declaring does, so `'dismiss'` is not among them — see
[The reserved reason](#the-reserved-reason).

`umbra/vanilla` has no factory to hang it on, so the controller carries the noun:
`controller.isActionRunning(reason)`. See [umbra/vanilla](#umbravanilla).

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

The value it matches on is the ARIA spelling, not the one you declared: `hotkey: 'Ctrl+s'` reaches
the DOM as `aria-keyshortcuts="Control+S"`, because every token of that attribute must be a
`KeyboardEvent.key` value — see [formatAriaKeyshortcuts](#key-formathotkeylabel-formatariakeyshortcuts-matcheshotkey).

> **Custom button wrappers must forward `aria-keyshortcuts`** onto the real `<button>`, or the
> hotkey has nothing to find.

### Declaring the reasons

`useModal<TData, TReason>` optionally closes the set of reasons:

```tsx
const modal = useModal<User, 'submit' | 'cancel'>({ … });
```

With them declared, `action('submmit')` is a compile error, the reason autocompletes, and a
`switch` on `result.reason` in `onClose` is exhaustive. Left undeclared, any string is accepted.
`'dismiss'` is always available as a _close reason_ — the library produces it on Escape, backdrop
click and teardown — and is the one reason no action may be named. See below.

### The reserved reason

`'dismiss'` means **the modal was dismissed rather than acted on**: the dismiss key, a backdrop
click, a click outside a non-modal panel, or teardown while it was still open. All four close the
store directly, and none of them runs an action — there is none to run.

So an action cannot be named it. `ActionReason<TReason>` is `Exclude<TReason, DismissReason>`, and
the exclusion is what keeps the reason honest:

```tsx
const modal = useModal<void, 'save' | 'dismiss'>({
  render: ({ action, handle }) => (
    <>
      <button {...action('save', save)}>Save</button>

      {/* ✗ compile error — a button is an act, and this reason means nobody acted */}
      <button {...action('dismiss')}>Close</button>

      {/* ✓ the handle takes it: you are reporting a dismissal, not declaring an action */}
      <button onClick={() => handle.close('dismiss')}>Close</button>
    </>
  ),
});
```

Declaring `'dismiss'` in your own union stays legitimate — it is a reason `onClose` sees whether
you write it out or not, and writing it makes the `switch` read honestly. `Exclude` is what stops
that declaration from also handing you an action you can name.

**If you want a key to run your handler instead of dismissing, that already has a spelling**, and
it is the one the dismiss key already honours: declare the key on a named action.

```tsx
// Escape runs this action — the modal dispatches by clicking the button, so the key path is the
// click path, running state and veto included. Dismissal defers.
<button {...action('cancel', { hotkey: Key.Escape, onAction: discardDraft })}>Cancel</button>
```

And for work that must happen on **every** dismissal — including the backdrop and the teardown,
neither of which can run a handler — the door is `onClose`, which every close passes through:

```tsx
onClose: (result) => {
  if (result.reason === DISMISS_REASON) {
    cleanup();
  }
};
```

`DISMISS_REASON` and its type `DismissReason` ship from the root, so a comparison never retypes
the string.

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

| Option                    | Type                                                             | Description                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | `string`                                                         | Unique modal identifier                                                                                                                                                                                                                                                                                                                                                                            |
| `render`                  | `(args: ModalRenderArgs<TData, TReason>) => ReactNode`           | Render function                                                                                                                                                                                                                                                                                                                                                                                    |
| `onKeyDown?`              | `(event: KeyboardEvent) => void`                                 | Escape hatch; runs before the action hotkeys the modal dispatches                                                                                                                                                                                                                                                                                                                                  |
| `animation?`              | `ModalAnimation`                                                 | CSS transition config                                                                                                                                                                                                                                                                                                                                                                              |
| `style?`                  | `CSSProperties`                                                  | Structural styles for the `<dialog>` box itself — the library places a dialog but never sizes it. Styles for what is _inside_ belong in `render`.                                                                                                                                                                                                                                                  |
| `prepare?`                | `(signal: AbortSignal) => void \| Promise<void>`                 | Called as the modal opens, alongside the entrance animation; `isPreparing` stays true until it settles, and the `<dialog>` carries `aria-busy` for that window. The signal aborts when the modal closes — a `() => …` callback stays assignable, so ignoring it costs nothing.                                                                                                                     |
| `onClose?`                | `(result: CloseResult<TData, TReason>) => void \| Promise<void>` | Called on close                                                                                                                                                                                                                                                                                                                                                                                    |
| `ariaLabel?`              | `string`                                                         | The dialog's accessible name. Omitted entirely when absent — a dialog with no name is announced as just "dialog", and `aria-label=""` would hide that from an audit.                                                                                                                                                                                                                               |
| `ariaLabelledBy?`         | `string`                                                         | Id of the element naming the dialog — usually its own heading. Takes precedence over `ariaLabel`; prefer it when the name is already on screen.                                                                                                                                                                                                                                                    |
| `ariaDescribedBy?`        | `string`                                                         | Id of the element describing the dialog — usually its body text.                                                                                                                                                                                                                                                                                                                                   |
| `role?`                   | `'dialog' \| 'alertdialog'`                                      | `'alertdialog'` for a dialog that interrupts to report something the user must act on — it is announced with its description rather than waiting to be read, so pair it with `ariaDescribedBy`. Not _required_ to: the APG says to omit the description when the content has structure (lists, tables, several paragraphs) that would be flattened into one announced string. Default: `'dialog'`. |
| `template?`               | `string`                                                         | The label this modal reports to `lookup()` and the DOM events — see [template](#template). Default: `'modal'`.                                                                                                                                                                                                                                                                                     |
| `dismissKey?`             | `HotkeyDef \| false`                                             | Key that dismisses the modal. Default: `Key.Escape`. Pass `false` to disable key dismissal. When an action hotkey matches `dismissKey`, the action takes priority automatically.                                                                                                                                                                                                                   |
| `dismissOnBackdropClick?` | `boolean`                                                        | Whether a backdrop click dismisses the modal. Not applicable when `nonModal: true`. Defaults to `false` when the render pass **drew** any actions (a modal offering buttons wants to be dismissed through one) and `true` when it drew none.                                                                                                                                                       |
| `dismissOnClickOutside?`  | `boolean`                                                        | Whether clicking outside the dialog dismisses it. Only applicable when `nonModal: true`. Suppressed while an action runs and, unless `dismissWhilePreparing`, while `prepare` is preparing. Only the dialog in front responds, and no non-modal dialog is in front while a modal one is open. Default: `false`.                                                                                    |
| `dismissWhilePreparing?`  | `boolean`                                                        | Whether the dismiss key, backdrop click, and click-outside can close the modal while `prepare` is executing. Default: `true`.                                                                                                                                                                                                                                                                      |
| `nonModal?`               | `boolean`                                                        | Use `dialog.show()` instead of `showModal()` (see below)                                                                                                                                                                                                                                                                                                                                           |
| `portal?`                 | `boolean`                                                        | Render via `createPortal(node, document.body)`. Default: `false`. For non-modal dialogs, `true` = viewport-anchored (`fixed`); `false` = contained (anchored to its host — see below). Modal dialogs (top layer) are unaffected by ancestors either way.                                                                                                                                           |

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
| Z-index        | Managed by browser                                                           | `1300 + stack position` — see [prioritize](#prioritize--deciding-the-stack-order)               |
| Data attribute | `data-modal-z` set for debugging                                             | `data-modal-z` set for debugging                                                                |
| Dismiss key    | `dismissKey` (default `Key.Escape`), requires focus                          | `dismissKey` (default `Key.Escape`), window-capture — no focus needed                           |
| Backdrop click | Configurable via `dismissOnBackdropClick`                                    | No effect (no backdrop exists)                                                                  |
| Click outside  | N/A (use `dismissOnBackdropClick`)                                           | Configurable via `dismissOnClickOutside` (default: `false`)                                     |
| Portal         | Inline by default (`portal: false`)                                          | Inline by default (`portal: false`)                                                             |
| Positioning    | Top layer — viewport-anchored regardless of portal                           | `portal: true` → viewport (`fixed`); `portal: false` → contained (`absolute`, anchored to host) |

#### Body scroll lock (modal only)

While at least one **modal** dialog is open, the library sets `data-dialog-open` on `<body>` and applies `overflow: hidden`. Hiding overflow removes a classic scrollbar, which widens the viewport and shifts every centered or right-aligned element — so the reclaimed width is reserved as body padding and the layout stays put.

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
- **`portal: false` (default) — "contained"** — the dialog renders inside a library-owned wrapper that is itself `position: absolute; inset: 0` over your nearest sized, positioned ancestor, and is positioned `absolute` against that wrapper. (Absolute rather than an in-flow `relative` block on purpose: a `height: 100%` block is laid out _after_ the content it is meant to cover and pushes it out of a clipped region. Overlaying is what "contained" means; displacing is not.) This is **immune to a transformed / `will-change` ancestor** hijacking the containing block (a `fixed` inline dialog would otherwise jump to that ancestor and flicker as the transform toggles). In return, it fills — and slides from — its nearest **sized** ancestor, so give it a sized, positioned host region; otherwise the panel collapses. It is an _inline contained panel_, not a viewport overlay. Slide templates size to `100%` (not `100dvw`/`100dvh`) in this mode.

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
(`template`, since a template names itself, and the internal `clipContainer`): `id`, `render`,
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

## umbra/solid

A sibling of `umbra/react`, not a port of it. Both sit on the same framework-free core — the modal
store, the action engine, the manager, the `attach*` DOM wiring, the placement table and the slide
geometry — and what each binding adds is how its framework schedules effects and owns nodes.

**The surface is the same, on purpose**, so a team running both frameworks writes the same modal
twice with the same words. Every section above applies unchanged: the same options, the same
render args, the same `action` factory, the same typed close. Three things differ, and all three
are the renderer's rather than a choice.

```tsx
import { Show } from 'solid-js';
import { useModal } from 'umbra/solid';

const modal = useModal<{ id: string }, 'save' | 'cancel'>({
  id: 'settings',
  ariaLabel: 'Settings',
  render: (ctx) => (
    <div>
      <Show when={ctx.isPreparing} fallback={<Form />}>
        Loading…
      </Show>
      <button {...ctx.action('cancel')}>Cancel</button>
      <button
        {...ctx.action('save', async (close) => {
          close({ id: await save() });
        })}
      >
        Save
      </button>
    </div>
  ),
  onClose: (result) => {
    if (result.reason === 'save') {
      report(result.data);
    }
  },
});
```

### 1. Live values are getters — do not destructure the render args

`isVisible`, `isPreparing`, `hasRunningAction` and `error` are getters over signals. `modal.isVisible`
reads the same way it does in React; inside JSX it subscribes that one expression instead of
re-rendering a component.

```tsx
// ✅ take the context and read through it — each read subscribes
render: (ctx) => <Show when={ctx.isPreparing}>…</Show>;

// ❌ destructuring reads the value once and freezes it, exactly as it does for props
render: ({ isPreparing }) => <Show when={isPreparing}>…</Show>;
```

The same applies to an action's props: spreading them inside a tracking scope subscribes
`disabled`, `data-loading` and `aria-busy` individually. That is why the `action` factory is shared
between the bindings rather than reimplemented — a virtual-DOM renderer spreads the object and
reads each getter once, which is the snapshot it wanted.

### 2. `portal: true` returns `Modal: null`

React's `createPortal` returns a node you still have to render. A Solid modal owns its element, so
the binding mounts it into `document.body` itself and there is nothing left to place. `portal: false`
(the default) behaves exactly as it does in React.

### 3. `useLookup` returns an accessor

`ModalInfo` is a discriminated union — `info.exists` narrows it — and a union cannot be handed back
as one object of getters without flattening the discriminant away, which would cost exactly the
narrowing the type exists for. So this one is called; `useDialogManager` next door is not.

```typescript
const info = useLookup('settings');
const label = () => (info().exists && info().isVisible ? 'Open' : 'Closed');

const manager = useDialogManager(); // a snapshot object, like React's
```

### `fromStore`

The bridge from the library's store contract to a Solid signal, and the one export React has no
counterpart for — React consumes `{ subscribe, getSnapshot }` through `useSyncExternalStore` with
no adapter. It is public because every Solid consumer would otherwise write the same six lines.

```typescript
import { createStore } from 'umbra';
import { fromStore } from 'umbra/solid';

const counter = createStore({ count: 0 });
const snapshot = fromStore(counter);

createEffect(() => {
  console.log(snapshot().count);
});
```

`equals: false` inside, because the store already decides what a change is — it skips notifying
when the next snapshot is equal, so a second identity check could only swallow a notification the
store meant to send.

> Solid is an **optional** peer (`^1.9.14`). Only this entry point touches it; the root and
> `umbra/vanilla` resolve with it absent.

---

## umbra/vanilla

The third binding, and deliberately **not** the same shape as the other two. `umbra/react` and
`umbra/solid` render a dialog _and_ its contents from a `render` callback; a vanilla binding that
did the same would have to ship a renderer, which is the one thing this library refuses to do.

So this one is a **controller**. The `<dialog>` and everything in it is markup you already wrote;
`bindDialog` drives the lifecycle over the top of it.

```html
<dialog id="confirm">
  <h2 id="confirm-title">Approve charge?</h2>
  <button id="cancel">Cancel</button>
  <button id="approve">Approve</button>
</dialog>
```

```typescript
import { bindDialog } from 'umbra/vanilla';

// `querySelector` returns `Element | null`, so narrow once rather than assert at the seam —
// this is also the check that tells you the id in the markup and the id here disagree.
const dialog = document.querySelector('#confirm');
if (!(dialog instanceof HTMLDialogElement)) {
  throw new Error('#confirm is not a <dialog>');
}

const confirm = bindDialog<{ receipt: string }, 'approve' | 'cancel'>({
  id: 'billing:confirm',
  dialog,
  ariaLabelledBy: 'confirm-title',
  prepare: async (signal) => {
    await loadQuote({ signal });
  },
  onClose: (result) => {
    if (result.reason === 'approve') {
      report(result.data);
    }
  },
});

confirm.bindAction(cancelButton, 'cancel');
const unbind = confirm.bindAction(approveButton, 'approve', {
  hotkey: 'Enter',
  onAction: async (close) => {
    close({ receipt: await charge() });
  },
});

const [error, result] = await confirm.openAndWait();
```

**Everything a modal _is_ is the same code the hook bindings run, in the same order**: phases and
the entrance/exit animation, `prepare` with its `AbortSignal`, the dismiss key on the dialog, on
its native `cancel` and at the window for a non-modal panel, click-outside, backdrop hit-testing,
opening focus and restoration after a failed action, the registration that makes it addressable by
id from another microfrontend, and the typed close. Every option documented under
[useModal](#usemodal-base-primitive) applies, minus `render` — with **one that means less here than
it does there**: `portal` selects the placement (`fixed` rather than contained) and does not move
the element, because the `<dialog>` is markup you wrote and relocating it would take its ids, its
stylesheet scope and its listeners with it. So `fixed` anchors to the viewport only if you placed
the element outside any transformed or `will-change` ancestor yourself. Pinned by _portal places
without relocating_ in `src/vanilla/__tests__/bind-dialog.ct.tsx`.

### `bindDialog(options)`

`BindDialogOptions` is `UseModalOptions` without `render`, plus three of its own:

| Option    | Type                | Description                                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog`  | `HTMLDialogElement` | **Required.** The element to drive. It is yours — this shows, hides, animates and listens on it, and never touches what is inside. Attributes the options do not name are left alone, so an `aria-labelledby` in the markup survives; the exception is `aria-busy`, which the library owns and keeps in step with `prepare`. |
| `host`    | `HTMLElement`       | The element a _contained_ non-modal panel is positioned against (`nonModal: true` without `portal`). Defaults to the dialog's parent, and must be sized — see [dialogPlacement](#dialogplacement). Ignored for every other variant.                                                                                          |
| `manager` | `DialogManager`     | The manager to register with. Defaults to the `dialogManager` singleton. This is the vanilla answer to `DialogManagerProvider`: there is no tree to read a context from, so an isolated instance is passed rather than provided.                                                                                             |

Positioning and animation are applied as **inline styles**, which outrank a stylesheet rule on
`dialog` — the same bargain the other two bindings make.

### `DialogController`

| Member                                 | Type                                          | Description                                                                 |
| -------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| `open()`                               | `() => Promise<void>`                         | Opens it. Resolves after `prepare` completes.                               |
| `openAndWait()`                        | `() => Promise<AwaitedClose<TData, TReason>>` | Opens it and resolves with how it closed — see [openAndWait](#openandwait). |
| `handle`                               | `ModalHandle<TData, TReason>`                 | `handle.close(reason?, data?)`, typed with this dialog's payload.           |
| `bindAction(button, reason, options?)` | `(…) => () => void`                           | Turns a button into one of this dialog's actions. Returns an **unbind**.    |
| `isActionRunning(reason)`              | `(reason) => boolean`                         | Whether **that** action is running — the hook bindings' `action.isRunning`. |
| `subscribe(listener)`                  | `(() => void) => () => void`                  | Every state change — phases and actions alike.                              |
| `getSnapshot()`                        | `() => ModalSnapshot`                         | `{ phase, isVisible, isPreparing, hasRunningAction, error }`.               |
| `destroy()`                            | `() => void`                                  | Unregister, close if open, settle every waiter, detach every listener.      |
| `dialogManager`                        | `DialogManager`                               | The manager this dialog is registered with.                                 |

### `bindAction` — the half a renderer does elsewhere

The vanilla counterpart of spreading `action(reason)` onto a button, and the one addition this
binding makes. It exists because nothing here re-renders: it attaches the click handler, writes
`aria-keyshortcuts` and `data-focus-on-open` once, and then keeps `disabled`, `data-loading` and
`aria-busy` synchronised as the action runs.

It takes the same [`ActionOptions`](#actionreason-handleroroptions) the hook bindings do —
`onAction`, `onClick`, `disabled`, `type`, `hotkey`, `focusOnOpen`.

**Call the unbind when the button goes away.** It removes the listener, retires the action's
declaration — which is what stops a hotkey outliving its button and what lets backdrop dismissal
go back to its no-actions default — and hands the button back as it was: `type`, `disabled`,
`data-loading`, `aria-busy`, `aria-keyshortcuts` and `data-focus-on-open` are all restored to
their pre-bind values. Restored rather than cleared, so a button _you_ disabled stays disabled.
Without that, unbinding mid-action would leave a permanently disabled control in your markup.

### Reacting to state without a renderer

`subscribe` / `getSnapshot` are how content that has to change with the dialog gets told, since
nothing re-renders it for you. The pair is the same `StoreContract` everything else in this package
speaks, so `fromStore` and `useSyncExternalStore` consume it unchanged.

```typescript
const stop = confirm.subscribe(() => {
  const { isPreparing, hasRunningAction } = confirm.getSnapshot();
  spinner.hidden = !isPreparing;
  form.inert = hasRunningAction;
  // Which one, not just that one — `bindAction` already keeps the button itself in step, and
  // this is the same fact for everything that is not the button.
  status.textContent = confirm.isActionRunning('publish') ? 'Publishing…' : '';
});
```

> **No framework, optional or otherwise.** This entry point imports nothing React or Solid ship, so
> it resolves in exactly the environments the root does — a plain page, an Astro island, a web
> component, a server-rendered app with a sprinkle of JavaScript.

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
  report(`refused: ${outcome.reason}`);
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
info.isForeground; // true if this is the dialog in front — see below
info.phase; // 'closed' | 'opening' | 'open' | 'closing'
info.isPreparing; // true while its prepare is still running
info.openedAt; // timestamp (0 for unregistered)
info.template; // the label its creator gave it (only on the registered branch)
info.nonModal; // boolean (absent for unregistered)

// Collection-level queries
const all = dialogManager.lookup();
all.getOpen(); // ModalInfo[] — all open, in stack order (bottom first)
all.getOpen('modal'); // ModalInfo[] — only showModal() dialogs
all.getOpen('non-modal'); // ModalInfo[] — only dialog.show() dialogs
all.getClosed(); // ModalInfo[] — registered but closed
all.getForeground(); // ModalInfo | undefined
all.getRegisteredCount(); // total registered modals
all.get('my-modal'); // same as lookup('my-modal')
all.exists('my-modal'); // true if registered
all.isVisible('my-modal'); // true if open
all.isForeground('my-modal'); // true if this is the dialog in front

// Counts and existence checks derive from the arrays:
all.getOpen().length; // open count
all.getOpen('modal').length > 0; // any modal dialog open?
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
| `isForeground` | `boolean`    | Whether this is the dialog in front — see the note below  |
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
| `template`                 | `string`  | The label its creator gave it — `'modal'` by default, `'slide'` from `useSlideModal`, anything your own template reports |
| `nonModal`                 | `boolean` | Whether opened with `dialog.show()`                                                                                      |

```typescript
const info = dialogManager.lookup('my-modal');
if (info.exists) {
  info.template; // string — no `?? ''` needed
}
```

`getOpen()`, `getClosed()`, `getForeground()` and `openDialogs` can only ever return registered
modals, so they are typed `RegisteredModalInfo` and need no narrowing at all.

### ModalLookup

| Method                 | Returns                  | Description                                                 |
| ---------------------- | ------------------------ | ----------------------------------------------------------- |
| `get(id)`              | `ModalInfo`              | Same as `lookup(id)` — null-object default for unregistered |
| `exists(id)`           | `boolean`                | Whether the modal is registered                             |
| `getForeground()`      | `ModalInfo \| undefined` | The dialog in front, or undefined                           |
| `getOpen(filter?)`     | `ModalInfo[]`            | Open modals in stack order; filter `'modal'`/`'non-modal'`  |
| `isVisible(id)`        | `boolean`                | Whether a specific dialog is on screen                      |
| `isForeground(id)`     | `boolean`                | Whether a specific dialog is the one in front               |
| `getClosed()`          | `ModalInfo[]`            | All registered but closed modals                            |
| `getRegisteredCount()` | `number`                 | Total registered modals                                     |

### What "in front" means

`isForeground` is not only a paint order — **it is what decides which dialog answers the dismiss key
and which one owns a click outside**, so it is worth knowing exactly how it is settled. Three keys,
bottom of the stack first:

1. **Modality.** Every non-modal dialog sits under every modal one. The platform paints top-layer
   elements above ordinary ones and no `z-index` reaches between them, so a panel opened half a
   second after an interruption is still behind it — and reporting it as the foreground would be
   false rather than debatable. A non-modal dialog is therefore never `isForeground` while any modal
   one is open.
2. **A policy**, if [`prioritize`](#prioritize--deciding-the-stack-order) installed one. Opt-in;
   without it this key does nothing.
3. **Open order** — the dialog whose `showModal()` landed last wins the tie.

---

## prioritize — deciding the stack order

A dialog's place in the stack is the order its `showModal()` landed in, and in an app assembled
from independent features that order is a **race**. A consent notice raised when a fetch settles, a
slide-over opened by a deep link, a session warning on a timer: none of them knows about the
others. Lose the race and the notice is behind a panel — under its backdrop, inert, dimmed —
while the user carries on with the thing the app was trying to interrupt. Nothing threw; the wrong
dialog is in front.

`prioritize` is one rule for the whole manager, installed once:

```typescript
import { dialogManager, type StackPriority } from 'umbra';

// Once, at start-up. Higher is nearer the user; ties keep open order, so a policy only has to say
// where it disagrees with "last one wins".
const stopPrioritizing = dialogManager.prioritize((modal) => {
  if (modal.id === 'session-expiring') {
    return 100;
  }
  return modal.template === 'slide' ? -10 : 0;
});
```

It applies to dialogs **already on screen**: a low-priority dialog that opens over a high-priority
one is put back underneath it before the frame is painted, and `openDialogs`, `foreground`,
`isForeground` and `getZIndex` all move with it — which matters beyond paint order, since
`isForeground` is what decides who answers the dismiss key and who owns a click outside.

The policy is told what a dialog **is**, never what it is doing:

| `StackModal` field | Meaning                                                       |
| ------------------ | ------------------------------------------------------------- |
| `id`               | The modal's id                                                |
| `template`         | Which template built it — `'modal'`, `'slide'`, your own name |
| `nonModal`         | Whether it uses `show()` rather than `showModal()`            |

`phase`, `isPreparing` and `isForeground` are deliberately absent. `isForeground` is what the
policy _decides_, and the other two move while a dialog is up — a priority that read them would
restack the top layer under the user's hands.

### What it costs

Moving a dialog inside the top layer means **closing and re-showing it**: the platform paints
top-layer elements in the order they were added and `z-index` does not apply between them (measured
— a dialog stamped `z-index: 9999` still paints under one shown after it). There is no other
mechanism, so a reorder has three visible consequences:

- The element's **native `close` event fires**. It is queued, so it arrives with `dialog.open`
  already back to `true` — which is the guard for a listener that has to tell a raise from a real
  close. The library's own `onClose`, `modal:close` and `subscribe` reporting is store-driven and
  is not involved. This matters most in `umbra/vanilla`, where the `<dialog>` and its listeners are
  yours.
- **CSS keyed on the element being shown re-runs** — `@starting-style`, a
  `dialog[open] { animation: … }`. The library's own entrance is driven by phase rather than by
  `[open]`, so it is unaffected.
- **Focus follows the dialog that ends up in front**, which is the one that should hold it: only
  the topmost modal dialog is not inert. A dialog that opens _underneath_ another declines its
  opening focus, so nothing is taken from what the user is looking at. A raise restores the exact
  element **for the dialog that held the keyboard** — the caret survives a policy installed over a
  form being typed in. A dialog that did _not_ hold it is re-shown by `showModal()`, which focuses
  its own first focusable rather than wherever the caret was, and that is a known limit rather
  than a decision: see the guard in
  [core/attach-focus.ts](src/core/attach-focus.ts), pinned by _keeps the keyboard when something
  opens over it_ in `src/vanilla/__tests__/bind-dialog.ct.tsx`.

Reorders are minimal — a swap lifts one dialog, not both — and nothing is re-shown or re-stamped
until `prioritize` is called.

**With one exception, on the way in.** The top layer is only tracked once a policy exists, so
installing one over dialogs that are _already open_ has nothing to compare against and re-shows every
open modal dialog, bottom-first. Installing at start-up, before anything opens, costs nothing.

### A policy orders each family, never across them

**Every non-modal dialog sits under every modal one**, and that is settled before the policy is
asked. The platform paints top-layer elements above ordinary ones and no `z-index` reaches between
them, so an order claiming otherwise would not be an opinion the library is entitled to hold — it
would be false, and `isForeground` is what decides who answers the dismiss key. Returning a huge
number for a panel therefore ranks it against the other panels and moves it no nearer the user.

This is a rule the library **enforces**, not a caveat you have to honour yourself. Two consequences
worth knowing, because neither is a policy you asked for:

- A non-modal panel is never the foreground while a modal dialog is open, so it stands down from the
  dismiss key even when the modal in front has `dismissKey: false` or is still preparing. Escape can
  then be answered by nobody. Before, the last-opened dialog took it.
- With **no** policy installed nothing re-stamps `z-index`, so after a close a dialog's
  `data-modal-z` and its index in `openDialogs` can disagree numerically. Nothing reads the stamp
  back and the relative order they describe is the same; do not treat `data-modal-z` as the stack
  position.

### The one thing it cannot do

It orders the dialogs of **one manager**. Two copies of this library in one page — two
microfrontends bundling their own — have two registries and two independent stacks; the
`modal:open` / `modal:close` document events are the only channel that crosses that line. In one
app, where features are uncoordinated but the manager is shared, it is the whole answer.

`stopPrioritizing()` puts the order back to what it would be with no policy — within each family,
since the modality rule was never the policy's — and reorders what is on screen to match. Calling
`prioritize` again **replaces** the policy — it is one project-wide rule, not a stack of them — and
the replaced policy's disposer becomes a no-op.

---

## Compatibility

**What works with what, in one place.** These facts used to live spread across this file, two
`CLAUDE.md` files, the changelog and a hundred JSDoc blocks — and prose in five places is prose that
disagrees with itself in five places: inventorying these rows produced seven defects before a single
cell was written.

The table below is **rendered from data** (`src/__tests__/compatibility-matrix.ts`) and a test fails
when this document and that data disagree, so the two cannot drift. What the gate checks is that every
option has a row, that no row names an option that no longer exists, and that every test a cell cites
resolves to a real file and a real title. What it cannot check — stated plainly rather than implied —
is that the cited test proves the cell.

<!-- BEGIN COMPATIBILITY MATRIX -->

### The states

| Symbol      | Means                                                     | On the worklist?         |
| ----------- | --------------------------------------------------------- | ------------------------ |
| ✓           | works, and a named test proves it                         | no                       |
| ✓ untested  | should work, nothing verifies it                          | **yes** — write the test |
| ~           | half works, and the limit is written down and fixable     | **yes**                  |
| ✗ platform  | the browser forbids it; no implementation would change it | no — never               |
| ✗ by design | the library refuses, with a documented reason             | no                       |
| n/a         | the combination has no meaning on this path               | no                       |

The two kinds of ✗ are **not the same fact**, and keeping them apart is the point: without the split, a list of everything that does not work contains items nobody can ever act on, and a real gap reads like a platform law.

### Option × option

One row per option a caller can pass. The **held by** column is the one to read: `TYPE` means the checker rejects the wrong combination, `RUNTIME` means a named function narrows or refuses, `PROSE` means a sentence and nothing else — so every `PROSE` row is a candidate to become one of the other two. **Exactly one pair is `TYPE` today**: `nonModal` against the two dismissal options, through `ModalVariant`.

| Option                   | Held by | Notes                                                                                                                                                                                                                                                                                 |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                     | RUNTIME | The manager’s key. Two live modals sharing one id is last-registration-wins, which is why the playground’s microfrontend demo namespaces them.                                                                                                                                        |
| `render`                 | TYPE    | **Excludes** umbra/vanilla. `BindDialogOptions` is an `Omit<…, "render">`: a controller does not render, so passing one is a type error rather than an ignored option.                                                                                                                |
| `animation`              | RUNTIME | **Depends on** style. `resolveAnimation` fills the optional halves once, so the declared `transition` and the `transitionend` the close waits on cannot disagree.                                                                                                                     |
| `style`                  | RUNTIME | Merged _over_ a template’s structural styles and over the placement, so a caller always wins. A `<dialog>` keeps the UA’s `fit-content` unless this says otherwise.                                                                                                                   |
| `dismissKey`             | RUNTIME | **Excludes** an action that declares the same hotkey. `engine.ownsHotkey` is asked at keydown, so an action claiming the key suppresses the dismissal rather than both firing. `false` turns the key off entirely.                                                                    |
| `dismissWhilePreparing`  | RUNTIME | **Depends on** prepare. One of the four inputs to `canDismiss`, which every dismissal path shares. Without `prepare` there is no preparing state for it to describe.                                                                                                                  |
| `containFocus`           | PROSE   | **Ignored by** nonModal: false. The Tab wrap `show()` does not give a dialog. A modal one is already trapped by the top layer, so the option is inert there — accepted, and nothing says so but a sentence.                                                                           |
| `onOpenRequest`          | RUNTIME | The asking door: refusal is explicit through `request.refuse(reason)`, acceptance is the default because the manager cannot infer it — React’s open is asynchronous.                                                                                                                  |
| `onKeyDown`              | RUNTIME | Scoped with `isOwnEventTarget`, so a modal opened from inside this one does not deliver its keys here on the way up.                                                                                                                                                                  |
| `prepare`                | RUNTIME | Gates the open and receives an `AbortSignal` the close aborts. `isPreparing` tracks the callback, not the `opening` phase.                                                                                                                                                            |
| `onClose`                | TYPE    | Takes `CloseResult<TData, TReason>`, so declaring the reasons on the hook is what makes a `switch` over them exhaustive.                                                                                                                                                              |
| `ariaLabel`              | PROSE   | **Excludes** ariaLabelledBy. Both may be passed and the platform prefers `aria-labelledby`; nothing rejects the pair. Omitted entirely when absent, because `aria-label=""` would hide the omission from an audit.                                                                    |
| `ariaLabelledBy`         | RUNTIME | **Depends on** an element with that id, rendered by the time prepare settles. `syncLabellingDiagnostics` reports ids that resolve to nothing — reading the element, not the options, because in `umbra/vanilla` the markup is the caller’s. Silent until `setLogLevel`.               |
| `ariaDescribedBy`        | PROSE   | Not required by `role: "alertdialog"`, deliberately: the APG says to omit a description when the content has semantic structure, so a type would turn a conditional recommendation into a rule.                                                                                       |
| `role`                   | TYPE    | A closed union of `"dialog" \| "alertdialog"`. Deliberately not the whole ARIA surface — a `<dialog>` is a dialog, and a surface that is not one wants a live region inside it.                                                                                                       |
| `template`               | RUNTIME | Free-form, and read by exactly one library path: the `StackModal` handed to a `prioritize` policy. That is how "every drawer under every alert" is expressed.                                                                                                                         |
| `clipContainer`          | PROSE   | **Depends on** nonModal, portal: false. `@internal` and set by the template hooks whose entrance slides past the container edge. Only affects the contained path; ignored elsewhere with nothing but this to say so.                                                                  |
| `portal`                 | PROSE   | **Ignored by** nonModal: false. A modal dialog is placed by the top layer, so `portal` changes nothing for it. In `umbra/vanilla` it selects the placement and does **not** move the element — the markup is the caller’s.                                                            |
| `nonModal`               | TYPE    | **Excludes** dismissOnBackdropClick when true, dismissOnClickOutside when false. **The one pair the checker holds.** `ModalVariant` is a discriminated union, so the wrong dismissal option for the variant is a compile error rather than an option that is silently read by nobody. |
| `dismissOnBackdropClick` | TYPE    | **Depends on** nonModal: false, at least one declared action. **Excludes** dismissOnClickOutside. Opt-in, and gated on `hasActions()` as well — a modal that has drawn no action does not dismiss on its backdrop, which is why `undeclare` matters beyond stale hotkeys.             |
| `dismissOnClickOutside`  | TYPE    | **Depends on** nonModal: true. **Excludes** dismissOnBackdropClick. The non-modal half. A modal dialog has no outside to click — the top layer swallows it — which is why these are two options and not one.                                                                          |

### Capability × binding

`binding-parity.test.ts` diffs the _names_ the two hook bindings export. This is what it cannot express: what a name does differently, and which binding a capability has actually been exercised on.

| Capability                                   | `umbra/react`                                                                                                                                                          | `umbra/solid`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `umbra/vanilla`                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| open / close / the typed close reason        | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| the render callback and the Modal it returns | ✓                                                                                                                                                                      | ✓ — Live values are getters, so the render args must not be destructured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | ✗ by design — A controller does not render. Shipping one would mean shipping UI, which is the library’s one refusal.                                                                                                                                                                                                                                                             |
| portal: true                                 | ✓ — `createPortal` returns a node the caller still places.                                                                                                             | ✓ — The binding mounts the element itself, so `Modal` is `null`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | ~ — Selects the placement, does not relocate: the `<dialog>` is markup the caller wrote. So `fixed` reaches the viewport only if they placed it outside any transformed ancestor.                                                                                                                                                                                                |
| ModalOutlet                                  | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✗ by design — No render pass, so nothing for an outlet to place.                                                                                                                                                                                                                                                                                                                 |
| the action factory (action(reason, …))       | ✓                                                                                                                                                                      | ✓ — Re-wrapped to attach `undeclare`, because Solid never re-runs the parent and a button removed by its own `<Show>` has to retire itself.                                                                                                                                                                                                                                                                                                                                                                                                            | ✗ by design — No declaration window. `bindAction(button, reason)` attaches to a button that already exists and its unbind retires it.                                                                                                                                                                                                                                            |
| per-action running state                     | ✓ — `action.isRunning(reason)`.                                                                                                                                        | ✓ — Same name, and it stays live through the wrapper — which is what the test pins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | ✓ — Spelled `isActionRunning(reason)` on the controller: there is no factory to hang it on.                                                                                                                                                                                                                                                                                      |
| useLookup                                    | ✓ — Returns the `ModalInfo` object.                                                                                                                                    | ✓ — Returns an accessor: a discriminated union cannot survive being spread into getters without losing the narrowing.                                                                                                                                                                                                                                                                                                                                                                                                                                  | ✓ — Through `manager.lookup(id)` — the same answer, without a reactive wrapper.                                                                                                                                                                                                                                                                                                  |
| phase, exposed to the caller                 | ✗ by design — A phase moves while the dialog is up; exposing it invites logic keyed on a transition. `isVisible` and `isPreparing` are the two answers a caller needs. | ✗ by design — Same reason, and the getters make it worse: a phase read inside JSX would subscribe that expression to every transition.                                                                                                                                                                                                                                                                                                                                                                                                                 | ✓ — The controller has no render pass, so its snapshot is the only clock a caller can read.                                                                                                                                                                                                                                                                                      |
| prioritize (the stack policy)                | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓ — Including a dialog inside a shadow root.                                                                                                                                                                                                                                                                                                                                     |
| focusOnOpen                                  | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓ — On a button the library never rendered — the caller forwards `data-focus-on-open`.                                                                                                                                                                                                                                                                                           |
| focus restored after a failed action         | ✓                                                                                                                                                                      | ~ — Focus lands on the `<dialog>` rather than on the button that ran the action — **measured**, and it is the race `attach-focus.ts` documents for `umbra/vanilla` reaching a second binding. Solid writes the action props’ `disabled` getter synchronously when the engine reports running, so the button is blurred before `captureActionRunner` reads `activeElement`; the `lastFocusInside` floor that catches this for the controller does not catch it here. Diagnosed, not fixed — a fix belongs with the coordinator rather than with a test. | ✓ — Reads `focusin` rather than `activeElement`, because this binding’s own `bindAction` disables the button synchronously first.                                                                                                                                                                                                                                                |
| the labelling diagnostic                     | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| onOpenRequest                                | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| containFocus                                 | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| dismissOnClickOutside                        | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| dismissOnBackdropClick                       | ✓                                                                                                                                                                      | ✓ — Reached through the `undeclare` test, which asserts dismissal coming back.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| a custom dismissKey                          | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| prepare aborted by a close                   | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                |
| reconcileOpen                                | ✓                                                                                                                                                                      | ✓                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | ✓ — Read off the snapshot the controller publishes rather than through `useLookup`, which is why `phase` is on this binding’s surface and on neither of the others. **Still open:** The `phase`-versus-`isVisible` half is proven on React only: moving the decision to `isVisible` fails there and does not here, and why it does not is unexplained rather than accounted for. |
| a dialog inside a shadow root                | ✓ untested                                                                                                                                                             | ✓ untested                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ✓                                                                                                                                                                                                                                                                                                                                                                                |

### The platform, and features meeting each other

| Can it?                                                      |             | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| z-index orders two dialogs in the top layer                  | ✗ platform  | Top-layer elements paint in the order they were added and `z-index` does not apply between them — measured: a dialog stamped `z-index: 9999` still paints under one shown after it. Moving one is `close()` + `showModal()` and nothing cheaper.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| a non-modal dialog can sit above a modal one                 | ✗ platform  | The top layer paints above ordinary content and no `z-index` reaches between them. So modality is the first sort key and a policy cannot overrule it — a big number on a panel ranks it against the other panels only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| a raise avoids firing the element’s native close event       | ✗ platform  | `close()` queues the event, so it arrives with `dialog.open` already back to `true` — which is the only guard a listener has for telling a raise from a real close. It matters most in `umbra/vanilla`, where the listener is the caller’s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| a raise keeps the caret where the user left it               | ~           | Restored for the dialog that **held** the keyboard — the case a late policy install hits. One that did not is re-shown by `showModal()`, which focuses its own first focusable. Fixing it needs a window `raiseDialog` can publish and the focus coordinator can read.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| installing a policy over dialogs already open is minimal     | ~           | The top layer is not tracked until a policy exists, so the first plan compares against nothing and re-shows every open modal dialog, bottom-first. Seeding the tracking at install time would fix it — and would also make the focus restore above dead, which is a decision rather than a tidy-up. Installing at start-up costs nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| the adopted stylesheet reaches a dialog inside a shadow root | ✓           | `adoptedStyleSheets` does not cross a shadow boundary, so the sheet is adopted per **root** rather than per document — `showDialog` adopts into `dialog.getRootNode()` on every open, idempotent. Without it the dialog shows the UA backdrop, measured at `rgba(0, 0, 0, 0.1)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| one Escape closes only the dialog it was pressed in          | ✓           | A modal opened from inside another renders its `<dialog>` in that subtree, so every event bubbles through the one underneath. `isOwnEventTarget` and `queryOwn` scope both the keydown and the hotkey dispatch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Escape is always answered by someone                         | ✗ by design | Put a modal with `dismissKey: false` in front of a non-modal panel and **nothing closes** — the modal was told not to listen and the panel is no longer the foreground. That is the right answer rather than a gap: the front dialog is what the user is looking at and it opted out, so falling through to the panel behind would close the one thing they cannot see. What makes it acceptable rather than a dead keyboard is measured separately — the press is **not swallowed**, so the application can still handle it, while a press the panel _does_ claim is stopped at the capture phase and never reaches the page. Both directions of that are asserted.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| a modal dialog’s own sizing survives the UA’s max-width      | ✗ platform  | `dialog:modal` gets `max-width/max-height: calc(100% - 6px - 2em)` — 337px on a 375px phone, so a panel asking for `min(600px, 92vw)` is cut by eight pixels. Above roughly 475px the two agree, which is why it survives every desktop review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| a 1px border flush to the dialog’s edge draws fully          | ✗ platform  | A `<dialog>` keeps `fit-content` and `margin: auto`, so its box lands on a fraction of a pixel and how much of the last one the compositor keeps is not the author’s to decide. Measured: three dialogs kept 16%, 91% and 73% of an identical right border. User-land fix — inset it, or size in whole pixels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| a contained non-modal panel needs nothing from the caller    | ✗ by design | It is `absolute` against a library-owned host that is itself `absolute; inset: 0` over the nearest sized, positioned ancestor — so the caller must provide that region or the panel collapses. Absolute rather than in-flow because a `height: 100%` block is laid out after the content it should cover.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| the body scroll lock is safe with two managers on one page   | ✓           | Claimed per owner and released when the last claim goes: the target is one global `<body>`, and a shared boolean would make it last-writer-wins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| the scroll lock compensates the right width                  | ✓           | It pads by what the lock **actually reclaims**, not by the current scrollbar width — a page with `scrollbar-gutter: stable` keeps its gutter through `overflow: hidden`, so the naive version shifts content inward.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| a policy orders two copies of the library on one page        | ✗ by design | A policy is installed on one manager and orders that manager’s dialogs. Two independent copies share the top layer and know nothing of each other — which is the microfrontend case the feature exists for, and the reason it is documented as a per-project decision.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| the React Compiler is verified to have run                   | ✓           | `verify:package` asserts both halves of the one grep the docs point at: the built `react/use-modal.js` imports React’s `compiler-runtime` **and** opens with a `c(n)` memo-cache allocation — the import alone would survive a build that compiled one trivial function and bailed on the hook. The complement is asserted too: the Solid binding must contain no `compiler-runtime`, since the compiler decides what a hook is by name and `umbra/solid` exports `useModal` as well. Seen to fail by restoring the pre-rolldown `react({ babel: … })` wiring, which is accepted and transforms nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| nothing in the repo still needs TypeScript 6                 | ~           | The linter runs on the TS 7 compiler through tsgolint. `typescript@6.0.3` remains for **typedoc alone**, whose two remaining jobs are `docs:check` and the JSON model behind the playground’s `/api` page — the HTML half is gone. TS 7 ships an API (`typescript/unstable/sync`) and it is **most of the way there**: exports, doc comments, `@example` tags, `typeToString` and `emitter.printNode` all work, and a lazy declaration node inflates through `resolve()`. Three measured blockers remain, and the middle one is the surprise: the resolved node exposes **no child traversal** (`children` is `undefined`, and no `forEachChild` is exported), so a syntax-level check like `notExported` cannot be written; walking the resolved _type graph_ instead is semantically the wrong question — it reports **0** findings against typedoc’s 10 allowances, because an alias resolves away; and the server **panics** rather than throwing on an unsupported checker call, so preconditions must be guarded rather than probed. So the `/api` model is the nearer half of this, not the validator. |

<!-- END COMPATIBILITY MATRIX -->

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
  const { id, template, openedAt } = e.detail;
  analytics.track('modal_shown', { id, template, openedAt });
});

document.addEventListener(MODAL_CLOSE_EVENT, (e: Event) => {
  const { id, template, reason, openedAt } = e.detail;
  analytics.track('modal_hidden', {
    id,
    template,
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

| Field      | Type     | Description                   |
| ---------- | -------- | ----------------------------- |
| `id`       | `string` | Modal id                      |
| `template` | `string` | The label its creator gave it |
| `openedAt` | `number` | `Date.now()` at open start    |

**`ModalCloseEventDetail`**

| Field      | Type                  | Description                         |
| ---------- | --------------------- | ----------------------------------- |
| `id`       | `string`              | Modal id                            |
| `template` | `string`              | The label its creator gave it       |
| `reason`   | `string \| undefined` | Close reason                        |
| `openedAt` | `number`              | `Date.now()` recorded at open start |

### template

A label the creator attaches, carried into `lookup()` and both DOM events. Any string, and
purely informational — nothing in the library reads it. It saves a cross-cutting listener
(analytics, a handler that only cares about drawers) from keeping its own id-to-kind table.

`useModal` defaults to `'modal'`; the built-in templates name themselves — `useMessageModal`
reports `'message'` and `useSlideModal` `'slide'`. A
template you write should name itself rather than inherit the default — the core deliberately
does not enumerate the templates built on it.

**It is not the modal / non-modal distinction.** That one is `nonModal`, and it reaches the DOM
as `data-modal-type` — two values, the library's own. This one is yours and open-ended; a
`nonModal` dialog that names no template still defaults to `'modal'`, which is why the two
cannot share a word.

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

| Property      | Type                     | Description                                                               |
| ------------- | ------------------------ | ------------------------------------------------------------------------- |
| `openDialogs` | `readonly ModalInfo[]`   | Open modals (modal and nonModal), in stack order — index = stack position |
| `foreground`  | `ModalInfo \| undefined` | The dialog in front — see the note under ModalLookup                      |

Everything else derives from `openDialogs`: counts via `.length`, modal vs
non-modal via `ModalInfo.nonModal` (`openDialogs.filter((d) => !d.nonModal)`),
and stack position via array index.

Ordered by modality first (every non-modal dialog under every modal one), then by whatever
[`prioritize`](#prioritize--deciding-the-stack-order) installed, then by open order.

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
| `modal:lifecycle`     | Opening phase, `prepare` callback, labelling diagnostics  |
| `modal:keydown`       | Dismiss-key handling (`dismissKey`, default `Key.Escape`) |
| `modal:click-outside` | Click-outside detection for non-modal dialogs             |
| `outlet`              | ModalOutlet registration and rendering                    |
| `action`              | Modal actions; hotkey registration & hits                 |

### Privacy

Logging is **opt-in, debug-only, and console-only** — nothing is persisted or transmitted. It never logs the `data` payload passed to `close(data)` (only a `withData` flag), nor the close `result`, render content, or store state. It **does** log `error.message` from your `prepare` / `onClose` / action callbacks and the close `reason`, either of which can carry user data if your code puts it there. Avoid enabling logging in **production**, where a session-replay / RUM tool may capture `console` output.

---

## Key, formatHotkeyLabel, formatAriaKeyshortcuts, matchesHotkey

A `HotkeyDef` is a string: a key, optionally prefixed with modifiers (`'Enter'`, `'Ctrl+Enter'`,
`'Ctrl+Shift+Delete'`). `Key` is the const object of key names — `Key.Enter`, `Key.Escape`,
`Key.S` — and `KeyValue` is the union of its values.

**A hotkey has two audiences, and they spell it differently.**

```typescript
import { Key, formatAriaKeyshortcuts, formatHotkeyLabel, matchesHotkey } from 'umbra';

// What a person reads — a menu item, a tooltip, a shortcuts sheet.
formatHotkeyLabel('Ctrl+Enter'); // → 'Ctrl+Enter'
formatHotkeyLabel('Shift+s'); // → 'Shift+S' — letter case is not significant, so it normalises

// What the platform parses. Every token of `aria-keyshortcuts` must be a `KeyboardEvent.key`
// value, and Control's is `Control` — `Ctrl` is a keycap, not a key value. The spacebar is the
// spec's own exception: its key value is a space, which cannot sit in a space-delimited list.
formatAriaKeyshortcuts('Ctrl+Enter'); // → 'Control+Enter'
formatAriaKeyshortcuts('Ctrl+ '); // → 'Control+Space'

// The same matcher the modal uses, for a keydown of your own.
element.addEventListener('keydown', (event) => {
  if (matchesHotkey(event, Key.Escape)) {
    dismiss();
  }
});
```

`formatAriaKeyshortcuts` is the canonical form: it is what an action writes onto its button, what
hotkey dispatch queries the DOM by, and what decides whether two hotkeys are the same one. A
wrapper that _forwards_ `aria-keyshortcuts` needs none of this; a wrapper that **builds** the
attribute itself must build it with this. The input spelling never changes — `HotkeyDef` still
takes `Ctrl+`, and `'Control+Enter'` is not one.

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

Solid needs one adapter and it ships as [`fromStore`](#fromstore) — six lines, public because
every Solid consumer would otherwise write the same six. Outside a component, the pair _is_ the
whole contract: subscribe, and read `getSnapshot()` when told.

```typescript
const stop = store.subscribe(() => {
  render(store.getSnapshot());
});
```

`useStore` (selectors and custom equality), `createStoreContext` (a store scoped to a subtree),
`watch` (observing outside React) and `shallowEqual` used to ship from here. They had no caller
inside the library, and a dialog manager is not where anyone looks for state management — so
they live in `playground/src/shared/lib/` now, as reference code to copy, on the same terms as
the modal templates. The playground's examples run on those copies.
