<div align="center">

# ◐ Umbra

**Headless dialogs on the native top layer.**

Framework-agnostic core, with React, Solid and vanilla bindings over it.

[![CI](https://github.com/francisdesjardins/umbra/actions/workflows/ci.yml/badge.svg)](https://github.com/francisdesjardins/umbra/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Solid](https://img.shields.io/badge/Solid-1.9-2c4f7c?style=flat-square&logo=solid&logoColor=white)](https://www.solidjs.com/)
[![Dependencies](https://img.shields.io/badge/dependencies-0-f59e0b?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-64748b?style=flat-square)](./LICENSE)

**[Open the playground →](https://francisdesjardins.ca/playground/dialog/)**

Every example on this page, running — plus the generated API reference for all four entry points,
the component test harnesses, and four microfrontends sharing one manager across React, Solid,
vanilla and a web component.

</div>

---

A **headless**, fully typed dialog/modal manager. The core is plain TypeScript with no framework in it; **React, Solid and vanilla ship as three bindings over it**. The two hook bindings share a surface — same names, same options, same typed close — and the vanilla one is a _controller_ for a `<dialog>` you wrote yourself. The library exports zero UI components — you bring your own (MUI, Tailwind, vanilla HTML/CSS).

## ◐ Entry points

| Specifier       | Contents                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `umbra`         | The manager (`dialogManager`), the placement and style tables, the store engine (`createStore`, `StoreContract`), `normalizeError`, `Key`. **No framework.** |
| `umbra/react`   | `useModal`, `useMessageModal`, `useSlideModal`, `ModalOutlet` — **plus everything above**, so a React app imports one path.                                  |
| `umbra/solid`   | The same names for Solid, plus `fromStore`, and the same wholesale re-export of the root.                                                                    |
| `umbra/vanilla` | `bindDialog` — a _controller_ for a `<dialog>` you wrote yourself. No `render`, no `Modal`, no outlet, and no framework. Same wholesale re-export.           |

The root resolves and runs with no framework installed at all, which is what lets a plain `.ts`
service, a router guard, a worker or an SSR path raise a dialog without a component. Each binding
reaches its own framework and only its own, so installing one is never a condition for using the
other. All of that is enforced by tests that walk the real import graphs — and re-checked against
the built package — not by convention.

**The two hook bindings share a surface deliberately.** Two differences, and both are the
renderer's: Solid's live values (`isVisible`, `isPreparing`, `hasRunningAction`, `error`) are
getters over signals, so read them through the object rather than destructuring it; and
`portal: true` mounts the dialog for you, leaving `Modal` as `null`.

**`umbra/vanilla` is a different kind on purpose.** It renders nothing — a binding that did would
mean shipping a renderer, which this library refuses to do — so the element and its contents stay
yours and `bindDialog` drives the lifecycle over them: phases and animation, `prepare`, the
dismiss key, click-outside, backdrop hit-testing, opening focus, the registration that makes it
addressable by id, and the typed close. `bindAction(button, reason)` is its one addition, and it
does the half a renderer would: attach the handler, then keep `disabled`, `data-loading` and
`aria-busy` in step.

## ◑ Features

- **Headless** — No UI opinions; use any component library or plain HTML/CSS
- **Framework-agnostic core** — React is a binding, not the library; a second binding is a sibling file
- **Primitive + template layers** — Core `useModal` powers `useMessageModal`, `useSlideModal`
- **Actions declared by use** — `action('save', handler)` inside `render` names the reason, binds the handler and returns `{ onClick, disabled, 'data-loading', 'aria-keyshortcuts'? }` to spread. Every field is a DOM prop, so the same set fits a bare `<button>`, MUI's, or your own — the core never guesses what your buttons are called
- **Type-safe** — Strict TypeScript with `exactOptionalPropertyTypes`, generics for close data and form values
- **Native `<dialog>`** — Renders inline by default; opt-in `portal: true` for `createPortal`, automatic z-index stacking
- **Go-style `openAndWait()`** — `const [err, result] = await modal.openAndWait()`; one call, and the only order that cannot lose the close
- **Scoped hotkeys** — `action('save', { hotkey: Key.Enter, onAction })`; the modal dispatches it by clicking the button, so the key path and the click path are the same path, running state and veto included. Scoped to the dialog that declared it: a modal opened from inside another never answers to the one in front of it
- **Opening focus you choose** — `action('cancel', { focusOnOpen: true })` starts the modal on the button that matters instead of on its first input
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

**Both frameworks are optional peers.** The root is plain TypeScript and resolves with neither
installed; `react` / `react-dom` (`^19.2.4`) are needed only by `umbra/react`, and `solid-js`
(`^1.9.14`) only by `umbra/solid`. `umbra/vanilla` needs neither, and resolves wherever the root
does — a plain page, an Astro island, a web component, a server-rendered app with a sprinkle of
JavaScript.

**Requirements:** Node >= 24.0.0 | Chrome 138+ (native `<dialog>`)

## ● Quick Start

An action is declared by being rendered. `action('confirm', handler)` names the reason, binds
the handler and returns the props to spread — one expression, at the one place it matters.
There is no action config and nothing to pass in.

```tsx
import { useMessageModal } from 'umbra/react';

function ConfirmDelete() {
  const modal = useMessageModal<void, 'confirm' | 'cancel'>({
    id: 'confirm-delete',
    ariaLabelledBy: 'confirm-delete-title',
    render: ({ action }) => (
      <div>
        <h2 id="confirm-delete-title">Delete Item</h2>
        <p>Are you sure?</p>
        <button {...action('cancel')}>Cancel</button>
        <button
          {...action('confirm', async (close) => {
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

The reason **is** the action's identity: it names the action and it is what the modal closes
with, so there is nothing to keep in sync.

### Typed close payloads and closed reasons

A modal declares what it closes with, and optionally _which reasons it may close with_:

```tsx
type User = { id: string; name: string };

const modal = useModal<User, 'submit' | 'cancel'>({
  id: 'create-user',
  render: ({ action, hasRunningAction }) => (
    <>
      <button {...action('cancel')}>Cancel</button>
      <button
        {...action('submit', (close) => {
          close(draft);
        })}
        disabled={hasRunningAction}
      >
        Save
      </button>
    </>
  ),
  onClose: (result) => {
    switch (result.reason) {
      case 'submit':
        save(result.data); // User | undefined
        return;
      case 'cancel':
      case 'dismiss':
        return;
    }
  },
});
```

Declaring the reasons is optional — leave them out and any string is accepted. Declare them and
you get three things: a mistyped `action('submmit')` is a compile error, the reason
autocompletes, and the `switch` above is **exhaustive**. `'dismiss'` is always in the union
because the library produces it itself, on Escape, on a backdrop click and on teardown.

## ◑ Without a framework

A module that has no component to hang a hook off — an API client, a router guard, a worker —
imports the root and drives dialogs by id. This file compiles and runs with no renderer installed:

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
For a dialog the service does not own, `requestOpenAndWait(id, request)` asks instead of
instructing and comes back with the owner's answer — a reason if it refused, the close if it did
not.

## ◐ API Reference

See **[API.md](API.md)** for the complete API documentation covering:

- `useModal` — Base primitive
- `useMessageModal` / `useSlideModal` — Template hooks
- `action(reason, handler?)` — actions, declared where they are rendered
- `createStore` / `StoreContract` — the zero-dependency reactive cell the library runs on, and the shape a binding consumes
- `dialogManager` — Imperative open/close
- `openAndWait()` — Go-style async result: open, and resolve with how it closed
- `requestOpen` / `requestOpenAndWait` — ask a dialog you do not own, and hear the answer
- `normalizeError` — turn whatever was thrown into an `Error`
- Hotkey system (`Key`, `matchesHotkey`, `HotkeyDef`)
- Debug logging

## ◑ Reference Templates

The library ships no UI components. Reference implementations for **MUI** and **vanilla HTML/CSS** are available in `playground/src/entities/modal-template/ui/`. Copy them into your project or write your own.

> **If you write a custom button wrapper**, you must forward `aria-keyshortcuts` and `data-focus-on-open` onto the underlying `<button>` element. Action hotkeys dispatch by querying `[aria-keyshortcuts]` in the DOM, and `focusOnOpen` finds its button by `[data-focus-on-open]` — dropping either prop makes the feature silently do nothing. A wrapper that spreads `...rest` onto its button already forwards both.

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
| `modal:lifecycle`     | prepare callback, dialog.showModal  |
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

## ◑ How this repo is run

Friendly warning, so nothing here surprises you: **I commit to `main`.** No release branches, no
deprecation cycles, and **no semver** — a name can change between two commits if a better one
turns up, and it does. This week `isOpen` became `isVisible` and `onOpen` became `prepare`,
because both were describing themselves inaccurately.

That is a deliberate trade, not neglect. The library is not published, so nobody's build breaks
when a name improves; what you get instead is a surface that says what it means. The day I decide
to publish it, that freedom ends and the usual ceremony starts — versions, a migration note per
break, the lot. Until then the CHANGELOG is the migration guide, organised by date, and it
explains _why_ each name moved rather than only that it did.

If you have lifted code out of `src/`, pin the commit you took it from.

## ◐ License

[MIT](./LICENSE) © 2026 Francis Desjardins

The source is here to read, copy and learn from. The reference templates and the user-land
patterns under `playground/src/` are meant to be lifted into your own project, which the MIT
terms allow without attribution or ceremony.

---

<div align="center">

░ &nbsp; ▒ &nbsp; ▓ &nbsp; ● &nbsp; ▓ &nbsp; ▒ &nbsp; ░

</div>
