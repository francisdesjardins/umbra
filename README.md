<div align="center">

# ◐ Umbra

**Headless dialogs on the native top layer.**

Framework-agnostic core with a React binding.

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-f59e0b?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-64748b?style=flat-square)](./LICENSE)

</div>

---

A **headless**, fully typed dialog/modal manager. The core is plain TypeScript with no framework in it; **React ships as one binding over it**. The library exports zero UI components — you bring your own (MUI, Tailwind, vanilla HTML/CSS).

## ◐ Entry points

| Specifier     | Contents                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `umbra`       | The manager (`dialogManager`), the store engine (`createStore`, `watch`), `normalizeError`, `Key`. **No React.**                                           |
| `umbra/react` | `useModal`, `useMessageModal`, `useSlideModal`, `useModalActions`, `ModalOutlet`, `useStore` — **plus everything above**, so a React app imports one path. |

The root resolves and runs with React not installed at all, which is what lets a plain `.ts`
service, a router guard, a worker or an SSR path raise a dialog without a component. That is
enforced by a test that walks the root's import graph, not by convention.

## ◑ Features

- **Headless** — No UI opinions; use any component library or plain HTML/CSS
- **Framework-agnostic core** — React is a binding, not the library; a second binding is a sibling file
- **Primitive + template layers** — Core `useModal` powers `useMessageModal`, `useSlideModal`
- **Modal actions** — `useModalActions` turns action configs into `{ onClick, loading, disabled, 'aria-keyshortcuts'?: string | undefined }` button props
- **Type-safe** — Strict TypeScript with `exactOptionalPropertyTypes`, generics for close data and form values
- **Native `<dialog>`** — Renders inline by default; opt-in `portal: true` for `createPortal`, automatic z-index stacking
- **Go-style `waitForClose()`** — `const [err, result] = await modal.waitForClose()`
- **Scoped hotkeys** — Declare via `defineAction({ hotkey: Key.X })`; the hook auto-generates the `onKeyDown` handler scoped to the dialog, respects loading/disabled state, and dispatches via `aria-keyshortcuts`
- **Zero runtime dependencies** — `react` and `react-dom` are _optional_ peers, needed only by `./react`
- **React Compiler ready** — No `useMemo`/`useCallback`/`React.memo`
- **Debug logging** — Zero-dep logger with namespace filtering via `localStorage`

## ◐ Using it

Clone the repo and run the playground, or lift what you need straight out of `src/` — it is
plain TypeScript with no build magic and no runtime dependencies.

```bash
git clone https://github.com/francisdesjardins/umbra.git
cd umbra
yarn install
yarn dev
```

**React is optional.** The root is plain TypeScript and resolves with React absent; `react` and
`react-dom` (`^19.2.4`) are needed only by `umbra/react`.

**Requirements:** Node >= 24.0.0 | Chrome 138+ (native `<dialog>`)

## ● Quick Start

```tsx
import { defineAction, useModalActions, useMessageModal } from 'umbra/react';

function ConfirmDelete() {
  const actions = useModalActions({
    cancel: defineAction(),
    confirm: defineAction(),
  });

  const modal = useMessageModal({
    id: 'confirm-delete',
    actions,
    render: () => (
      <div>
        <h2>Delete Item</h2>
        <p>Are you sure?</p>
        <button {...actions.cancel()}>Cancel</button>
        <button
          {...actions.confirm(async (close) => {
            await api.deleteItem();
            close();
          })}
        >
          Delete
        </button>
      </div>
    ),
  });

  return (
    <>
      <button onClick={() => modal.open()}>Delete</button>
      {modal.Modal}
    </>
  );
}
```

### Typed close payloads

A modal can close with data, and the type of that data is declared **once** — on the action that
produces it. It reaches the modal from there, so the hook takes no type argument:

```tsx
type User = { id: string; name: string };

const actions = useModalActions({
  cancel: defineAction(),
  submit: defineAction<User>(), // the payload's one declaration
});

// No `useModal<User>` — `User` arrives through `actions`.
const modal = useModal({
  id: 'create-user',
  actions,
  render: () => {
    return <button {...actions.submit((close) => close(draft))}>Save</button>;
  },
  onClose: (result) => {
    result.data; // User | undefined
  },
});

const [error, result] = await modal.waitForClose();
if (error === null) {
  result.data; // User | undefined — narrowed by the tuple, no null check needed
}
```

Annotate the modal yourself only when nothing else carries the payload: a modal with no
`actions`, or one whose actions all close bare and whose payload goes through `handle.close`.

## ◑ Without React

A module that has no component to hang a hook off — an API client, a router guard, a worker —
imports the root and drives dialogs by id. This file compiles and runs with React absent:

```ts
import { dialogManager } from 'umbra';

/** Open a dialog and resolve with the reason it closed. */
const askConfirmation = (id: string) => {
  return new Promise<string>((resolve) => {
    const unsubscribe = dialogManager.subscribe((event) => {
      if (event.type === 'close' && event.id === id) {
        unsubscribe();
        resolve(event.reason ?? 'dismiss');
      }
    });
    dialogManager.open(id);
  });
};

export const deleteAccount = async () => {
  if ((await askConfirmation('confirm-delete')) !== 'confirm') {
    return;
  }
  await api.deleteAccount();
};
```

Your UI layer only has to _register_ a modal with that id; the service decides when it appears.
`open()` plus a one-shot `subscribe()` is the imperative equivalent of `waitForClose()`.

## ◐ API Reference

See **[API.md](API.md)** for the complete API documentation covering:

- `useModal` — Base primitive
- `useMessageModal` / `useSlideModal` — Template hooks
- `useModalActions` / `defineAction` — Action button management
- `createStore` / `useStore` / `createStoreContext` / `watch` — State management (zero-dependency reactive cell)
- `dialogManager` — Imperative open/close
- `waitForClose()` — Go-style async result
- `normalizeError` — turn whatever was thrown into an `Error`
- Hotkey system (`Key`, `matchesHotkey`, `HotkeyDef`)
- Debug logging

## ◑ Reference Templates

The library ships no UI components. Reference implementations for **MUI** and **vanilla HTML/CSS** are available in `playground/src/entities/modal-template/ui/`. Copy them into your project or write your own.

> **If you write a custom button wrapper**, you must forward `aria-keyshortcuts` onto the underlying `<button>` element. Action hotkeys dispatch by querying `[aria-keyshortcuts]` in the DOM — dropping the prop causes `Enter`/`Escape` shortcuts to silently break.

## ◐ Debug Logging

```js
// Browser console — enable all namespaces:
localStorage.setItem('dialog:log', '*');

// Specific namespaces:
localStorage.setItem('dialog:log', 'modal,action');

// Programmatic:
import { setLogLevel } from 'umbra';
setLogLevel('*');
```

| Namespace             | Description                         |
| --------------------- | ----------------------------------- |
| `manager`             | Registration, stack state           |
| `modal`               | Open/close/unmount lifecycle        |
| `modal:lifecycle`     | onOpen callback, dialog.showModal   |
| `modal:keydown`       | ESC dismiss, user onKeyDown         |
| `modal:click-outside` | Click-outside for non-modal dialogs |
| `outlet`              | ModalOutlet registration            |
| `action`              | Action start/end, state changes     |

## ◑ Development

This repo uses **Yarn 4**, pinned via the `packageManager` field and resolved through
[Corepack](https://nodejs.org/api/corepack.html) — run `corepack enable` once, then:

```bash
yarn install         # Install dependencies (--immutable in CI)
yarn dev             # Start playground
yarn build           # Build library (ESM bundle + .d.ts via tsc)
yarn type-check      # TypeScript strict check
yarn test            # Unit + component tests
yarn lint            # oxlint + ESLint
yarn format          # Prettier
```

## ◐ License

[MIT](./LICENSE) © 2026 Francis Desjardins

The source is here to read, copy and learn from. The reference templates and the user-land
patterns under `playground/src/` are meant to be lifted into your own project, which the MIT
terms allow without attribution or ceremony.

---

<div align="center">

░ &nbsp; ▒ &nbsp; ▓ &nbsp; ● &nbsp; ▓ &nbsp; ▒ &nbsp; ░

</div>
