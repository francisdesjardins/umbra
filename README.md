<div align="center">

# <img src="docs/brand/moon-first-quarter.svg" width="24" height="24" alt="" /> Umbra

**Headless dialogs on the native top layer.**

Framework-agnostic core, with React, Solid and vanilla bindings over it.

[![CI](https://github.com/francisdesjardins/umbra/actions/workflows/ci.yml/badge.svg)](https://github.com/francisdesjardins/umbra/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Solid](https://img.shields.io/badge/Solid-1.9-2c4f7c?style=flat-square&logo=solid&logoColor=white)](https://www.solidjs.com/)
[![Unit coverage](https://img.shields.io/badge/unit_coverage-97%25-3fb950?style=flat-square)](#development)
[![Component coverage](https://img.shields.io/badge/component_coverage-92%25-3fb950?style=flat-square)](#development)
[![Dependencies](https://img.shields.io/badge/dependencies-0-f59e0b?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-64748b?style=flat-square)](./LICENSE)

**[Open the playground →](https://francisdesjardins.ca/playground/dialog/)**

Every example on this page, running — plus the generated API reference for all four entry points,
the component test harnesses, and four microfrontends sharing one manager across React, Solid,
vanilla and a web component.

</div>

---

A **headless**, fully typed dialog manager. The core is plain TypeScript with no framework in it; **React, Solid and vanilla ship as three bindings over it**. The two hook bindings share a surface — same names, same options, same typed close — and the vanilla one is a _controller_ for a `<dialog>` you wrote yourself. The library exports zero UI components — you bring your own (MUI, Tailwind, vanilla HTML/CSS).

## <img src="docs/brand/moon-first-quarter.svg" width="18" height="18" alt="" /> Entry points

| Specifier       | Contents                                                                                                                                                                                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `umbra`         | The manager (`dialogManager`, `createDialogManager`), the placement and style tables (`dialogPlacement`, `applyStyle`), the store engine (`createStore`, `StoreContract`), `normalizeError`, the key utilities (`Key`, `HotkeyDef`, `matchesHotkey`, `formatHotkeyLabel`, `formatAriaKeyshortcuts`) and `setLogLevel`. **No framework.** |
| `umbra/react`   | `useDialog`, `useMessageDialog`, `useSlideDialog`, `DialogOutlet`, `DialogManagerProvider`, `useDialogManager`, `useLookup` — **plus everything above**, so a React app imports one path.                                                                                                                                                |
| `umbra/solid`   | The same names for Solid, plus `fromStore`, and the same wholesale re-export of the root.                                                                                                                                                                                                                                                |
| `umbra/vanilla` | `bindDialog` — a _controller_ for a `<dialog>` you wrote yourself — whose `bindAction` is a **member of the controller it returns**, not a second export. No `render`, no `Dialog`, no outlet, and no framework. Same wholesale re-export.                                                                                               |

The root resolves and runs with no framework installed at all, which is what lets a plain `.ts`
service, a router guard, a worker or an SSR path raise a dialog without a component. Each binding
reaches its own framework and only its own, so installing one is never a condition for using the
other. All of that is enforced by tests that walk the real import graphs — and re-checked against
the built package — not by convention.

**The two hook bindings share a surface deliberately.** Three differences, and all three are the
renderer's: Solid's live values (`isVisible`, `isPreparing`, `hasRunningAction`, `error`) are
getters over signals, so read them through the object rather than destructuring it; `useLookup`
returns an accessor rather than an object, because a discriminated union cannot survive being
spread into getters; and `portal: true` mounts the dialog for you, leaving `Dialog` as `null`.

**`umbra/vanilla` is a different kind on purpose.** It renders nothing — a binding that did would
mean shipping a renderer, which this library refuses to do — so the element and its contents stay
yours and `bindDialog` drives the lifecycle over them: phases and animation, `prepare`, the
dismiss key, click-outside, backdrop hit-testing, opening focus, the registration that makes it
addressable by id, and the typed close. `bindAction(button, { reason })` is its one addition, and it
does the half a renderer would: attach the handler, then keep `disabled`, `data-loading` and
`aria-busy` in step — and hand the button back as it was when you unbind it, since the markup is
yours and outlives the controller.

## <img src="docs/brand/moon-last-quarter.svg" width="18" height="18" alt="" /> Features

- **Headless** — No UI opinions; use any component library or plain HTML/CSS
- **Framework-agnostic core** — React is a binding, not the library; a second binding is a sibling file
- **Primitive + template layers** — Core `useDialog` powers `useMessageDialog`, `useSlideDialog`
- **Actions declared by use** — `action('save', handler)` inside `render` names the reason, binds the handler and returns `{ type, onClick, disabled, 'data-loading', 'aria-busy', 'data-action-reason', 'aria-keyshortcuts'?, 'data-focus-on-open'? }` to spread. Every field is a DOM prop, so the same set fits a bare `<button>`, MUI's, or your own — the core never guesses what your buttons are called
- **Which action is running, not just that one is** — `action.isRunning('publish')` is the per-action state anywhere the button's own `data-loading` cannot reach: a header, a locked field, a status line. `hasRunningAction` stays the aggregate
- **Type-safe** — Strict TypeScript with `exactOptionalPropertyTypes`, generics for close data and form values
- **Native `<dialog>`** — Renders inline by default; opt-in `portal: true` for `createPortal`, automatic z-index stacking
- **Who is in front is a decision, not a race** — `dialogManager.prioritize((dialog) => number)` installs one project-wide rule, so "every drawer under every alert" is stated once instead of being settled by whichever `showModal()` landed last. Modality is a fact no policy can touch: the top layer paints above ordinary content and no `z-index` reaches between them
- **When the `open` is a prop** — a dialog it owns cannot close itself, because the boolean upstream would put it straight back. `reconcileOpen(phase, open)` puts the dialog wherever the prop says, reconciled on every pass rather than reacted to; `onDismissRequest` turns every dismissal — the key, a backdrop click, a click outside a panel, each naming itself — into a report to the owner, with every gate above it — which key, an action claiming it, where the pointer landed, `prepare`, which dialog is in front — still the library's
- **Content that isn't ready yet** — `prepare(signal)` runs alongside the entrance animation and gates `isPreparing` and the promise `open()` returns; its `AbortSignal` fires when the dialog closes, so a dialog dismissed while it loads drops the work it started
- **Non-modal panels, positioned honestly** — `dialogPlacement` ships from the core as a table of CSS, so every binding puts a panel in the same place: `portal: true` anchors it to the viewport, `portal: false` contains it in a library-owned wrapper immune to a transformed ancestor hijacking the containing block
- **Go-style `openAndWait()`** — `const [err, result] = await dialog.openAndWait()`; one call, and the only order that cannot lose the close
- **Scoped hotkeys** — `action('save', { hotkey: Key.Enter, onAction })`; the dialog dispatches it by clicking the button, so the key path and the click path are the same path, running state and veto included. Scoped to the dialog that declared it: a dialog opened from inside another never answers to the one in front of it
- **Opening focus you choose** — `action('cancel', { focusOnOpen: true })` starts the dialog on the button that matters instead of on its first input
- **Shadow DOM** — a `<dialog>` inside a web component gets the library's backdrop (the sheet is adopted per root, since `adoptedStyleSheets` does not cross the boundary) and its focus policy asks that root rather than the document
- **Across bundles** — `requestOpen` / `requestOpenAndWait` ask a dialog another microfrontend owns, and the `dialog:open` / `dialog:close` DOM events report every dialog on the page, including ones raised by a different copy of the library
- **Server-rendered markup** — `umbra/vanilla` binds to a `<dialog>` that is already in the document, and **adopts one that already carries `open`** rather than closing it out from under a page that has been showing it since first paint. A server cannot render a _dialog_ dialog and no library can change that — the top layer is enterable only from script — so an `open` attribute in HTML is a non-modal open, and a modal one is closed on binding with a warning rather than pretending to a backdrop it does not have
- **Zero runtime dependencies** — `react` / `react-dom` and `solid-js` are _optional_ peers, each needed only by its own binding; `./vanilla` and the root need neither
- **React Compiler ready** — No `useMemo`/`useCallback`/`React.memo`
- **A measured browser floor** — Chrome/Edge 110+, Safari 16.4+, Firefox 115+, set by what the code actually calls rather than picked; the accounting is under _Using it_ below
- **Debug logging** — Zero-dep logger with namespace filtering via `localStorage`

## <img src="docs/brand/moon-full.svg" width="18" height="18" alt="" /> Accessibility

The accessible half of a dialog is mostly the platform's, and the library's job is to keep it
intact — then hand you the one lever only you hold, and refuse the ones that would lie. Every
claim below is a cell in the compatibility matrix ([API.md → Compatibility](API.md#compatibility)),
where each cites the test that proves it on which engine and which binding — including a
**WCAG 2.2 chapter**, criterion by criterion, that says which halves are the library's and which
are deliberately yours.

- **Native `<dialog>`, natively dialog.** `showModal()` puts the dialog in the top layer and makes
  the rest of the document inert, and that is what assistive technology is told — the library never
  writes `aria-modal`, because the attribute is redundant on a modal dialog and a lie on a
  non-modal one.
- **The name is yours, and never invented.** `ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy`
  reach the element; an absent option omits the attribute entirely, because `aria-label=""` is the
  spelling that hides a nameless dialog from an audit. A shipped diagnostic (silent until
  `setLogLevel`) reports a reference that resolves to nothing, a dialog with no accessible name at
  all, and `role="alertdialog"` on a non-modal dialog — the one role pairing the type system
  already refuses on the hook bindings, an alertdialog being dialog by definition.
- **`aria-busy` is the one attribute the library owns.** Written both ways, `"false"` included,
  tracking `prepare` — a dialog is never left silently announcing itself as loading.
- **The hotkey attribute is the mechanism.** A hotkey dispatches by querying
  `[aria-keyshortcuts]` and clicking what it finds, so the attribute a screen reader announces and
  the behaviour it describes cannot drift apart — and a custom button wrapper that drops the prop
  loses its hotkeys, which is pinned in both directions.
- **Focus moves are measured, and visible.** Opening focus (`focusOnOpen`), the restore after a
  failed action, the reclaim when the stack moves, and the keyboard handed back to the opener when
  a non-modal panel closes — each is pinned per engine, and every focus move the library makes on
  the user's behalf shows a `:focus-visible` ring, because input-modality heuristics make a
  library-made focus invisible on two engines out of three. `restoreFocusTo` redirects that last
  one when the opener is no longer the right answer — a list that drove the panel's content is the
  case — and only where the restore already owns the focus, so a caret you moved yourself stays. The
  ring is drawn on the way back too: the platform's own restore shows one by input modality, so
  closing with the mouse would otherwise hand the keyboard back invisibly. `handle.moveFocus` is
  the same scan offered outward, for a device the browser never turns into Tab — a controller's
  d-pad is the case, and `/interop` drives one.
- **`containFocus` buys the Tab wrap; the recovery is unconditional.** Keeping Tab inside is
  opt-in because on a toast or a popover it is the defect rather than the fix — but recovering a
  Tab pressed on the `<dialog>` element itself (a dead-space click puts it there, and WebKit
  swallows the press) works on every dialog, flag or no flag.
- **A toast is a live region, and it lives outside the dialog.** The library refuses
  `role="status"` on a `<dialog>` and ships no announcer — a live region only announces reliably
  when it exists _before_ its content, which is a structural fact no dialog-rendered region can
  satisfy. The playground's `useAnnouncer` is the copyable pattern, and its corner toast runs it.
- **Reduced motion is one CSS rule, and the close path is built to meet it.**
  `@media (prefers-reduced-motion: reduce) { dialog { transition: none !important } }` — the
  library _measures_ whether transitions are live and finalizes a close immediately when they are
  not, so the rule cannot hang an exit waiting for a `transitionend` that never comes. Animations
  are defaults you replace; the playground ships that rule itself.
- **Forced colors keeps the silhouette, if you give it one.** Windows High Contrast strips author
  backgrounds and shadows: the library's backdrop is replaced by the system's own scrim, and a
  surface drawn by shadow alone disappears. Measured under emulation: the reference templates all
  stay delimited, because each carries a real border on the edge that matters — the one rule a
  consumer needs. The focus ring comes back in the system Highlight on its own.

## <img src="docs/brand/moon-first-quarter.svg" width="18" height="18" alt="" /> Using it

Clone the repo and run the playground, or lift what you need straight out of `src/` — it is
plain TypeScript with no build magic and no runtime dependencies.

```bash
git clone https://github.com/francisdesjardins/umbra.git
cd umbra
yarn install
yarn dev
```

**Both frameworks are optional peers.** The root is plain TypeScript and resolves with neither
installed; `react` / `react-dom` (`^19.0.0`) are needed only by `umbra/react`, and `solid-js`
(`^1.9.0`) only by `umbra/solid`. `umbra/vanilla` needs neither, and resolves wherever the root
does — a plain page, an Astro island, a web component, a server-rendered app with a sprinkle of
JavaScript.

**Requirements:** Chrome/Edge 110+ · Safari 16.4+ · Firefox 115+

That floor is what the code actually uses, measured rather than picked: constructed
`CSSStyleSheet` + `adoptedStyleSheets` sets the Safari bound, `Array.prototype.toSorted` the
Chrome and Firefox ones, and native `<dialog>` — the headline requirement — has been the widest
of the three since Firefox 98. In [Baseline](https://web.dev/baseline) terms, everything the
floor rests on has been Baseline since 2023 — the version numbers above are the same fact,
spelled as the measurement it came from. Node >= 24 is a **contributor** requirement — see
Development below; the package is browser code with zero runtime dependencies, so nothing about
it cares what a consumer builds with.

## <img src="docs/brand/moon-full.svg" width="18" height="18" alt="" /> Quick Start

An action is declared by being rendered. `action('confirm', handler)` names the reason, binds
the handler and returns the props to spread — one expression, at the one place it matters.
There is no action config and nothing to pass in.

```tsx
import { useMessageDialog } from 'umbra/react';

function ConfirmDelete() {
  const dialog = useMessageDialog<void, 'confirm' | 'cancel'>({
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
      <button onClick={() => dialog.open()}>Delete</button>
      {dialog.Dialog}
    </>
  );
}
```

The reason **is** the action's identity: it names the action and it is what the dialog closes
with, so there is nothing to keep in sync.

### Typed close payloads and closed reasons

A dialog declares what it closes with, and optionally _which reasons it may close with_:

```tsx
type User = { id: string; name: string };

const dialog = useDialog<User, 'submit' | 'cancel'>({
  id: 'create-user',
  render: ({ action, hasRunningAction }) => (
    <>
      <button {...action('cancel')}>Cancel</button>
      <button
        {...action('submit', (close) => {
          close(draft);
        })}
      >
        {hasRunningAction ? 'Saving…' : 'Save'}
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

### Declaring your dialogs in one place

Everything above is declared at the call site, which is fine until the app has forty dialogs and a
bug report names one by id. Then two questions get hard: **which component owns `confirm-delete`**,
and **what does it close with**. A project can answer both once, by declaring its dialogs in a
single interface:

```ts
// src/dialogs.d.ts — or anywhere your tsconfig includes
declare module 'umbra' {
  interface DialogRegistry {
    'confirm-delete': { closesWith: { confirm: { id: string }; cancel: void } };
    'session-warning': { closesWith: 'extend' | 'sign-out' };
    'patient:merge': { opensWith: { patientId: string }; closesWith: 'merged' | 'cancel' };
    'command-palette': Record<string, never>;
  }
}
```

An entry names the two directions — `closesWith` for the close, `opensWith` for the open — and both
are optional. `closesWith` takes the bare reasons when none carries a payload, or one per reason;
a payload declared that way is **required** when closing with that reason.

From then on the id is checked wherever one is accepted, in both directions:

```ts
dialogManager.open('confirm-delete'); // fine
dialogManager.open('confirm-delet'); // Allowed — an unknown id is a supported one
dialogManager.close('confirm-delete', 'extend'); // Type error: that reason belongs to another dialog
dialogManager.requestOpen('patient:merge', { payload: { patientId: 42 } }); // Type error: it declared a string
```

`payload` types the **asking** side, where both call sites are yours. `onOpenRequest` still receives
`unknown` on purpose — that is where a message from outside the project arrives, and a declaration
is a contract between call sites rather than a check on what turns up. Parse it; `PayloadOf<'patient:merge'>`
is the type to parse to.

And `useDialog` reads the contract off the id, so a declared dialog needs no type arguments at all:

```tsx
const dialog = useDialog({
  id: 'confirm-delete',
  render: ({ handle }) => <button onClick={() => handle.close('confirm', { id })}>Delete</button>,
  onClose: (result) => {
    if (result.reason === 'confirm' && result.data) {
      remove(result.data.id); // typed, without `useDialog<{ id: string }, …>` anywhere
    }
  },
});
```

**The registry becomes the index.** Because every key is a real type, "which component opens this?"
is find-references on the key rather than a grep across the codebase — which is the half of this
that pays off during a bug hunt rather than at the keyboard.

Three things to know before adopting it:

- **Declare as few as you like.** An id the registry does not name still works, so you can adopt
  one dialog at a time — and an app can host dialogs it does not own. The trade is that a mistyped
  id is not an error: what a declared entry buys is its _contract_, not exhaustiveness.
- **Payload types have to be exported** to be named in the registry. Types that were local to one
  component become part of the app's vocabulary, which is usually an improvement and is always
  work.
- **Nothing changes if you skip it.** The interface ships empty, and while it is empty an id is
  the `string` it has always been — no new errors, and the per-call-site `useDialog<TData, TReason>`
  form keeps working exactly as documented above. Both forms are supported; the registry is the one
  that scales with the number of dialogs.

## <img src="docs/brand/moon-last-quarter.svg" width="18" height="18" alt="" /> Without a framework

A module that has no component to hang a hook off — an API client, a router guard, a worker —
imports the root and drives dialogs by id. This file compiles and runs with no renderer installed:

```ts
import { dialogManager } from 'umbra';

export const deleteAccount = async () => {
  const [unavailable, closed] = await dialogManager.openAndWait('confirm-delete');
  if (unavailable) {
    return report(unavailable.message); // nobody registered that id — an answer, not a hang
  }
  if (closed.reason === 'confirm') {
    // 'cancel' or 'dismiss' otherwise, and the checker knows it
    await api.deleteAccount();
  }
};
```

`openAndWait` is the same door a hook offers, on the manager instead — so the service needs no
component to hold one. `reason` and `data` are typed, and correlated, if the id is [in the registry](#declaring-your-dialogs-in-one-place)
and open if it is not, and there is no listener to unsubscribe or to register in the right order.

Your UI layer only has to _register_ a dialog with that id; the service decides when it appears.
For a dialog the service does not own, `requestOpenAndWait(id, request)` asks instead of
instructing and comes back with the owner's answer — a reason if it refused, the close if it did
not.

## <img src="docs/brand/moon-first-quarter.svg" width="18" height="18" alt="" /> API Reference

See **[API.md](API.md)** for the complete API documentation covering:

- `useDialog` — Base primitive
- `useMessageDialog` / `useSlideDialog` — Template hooks
- `action(reason, handler?)` — actions, declared where they are rendered
- `dialogPlacement` / `DialogAnimation` — where a non-modal dialog sits, and how any of them animates
- `DialogOutlet` — render registered dialogs from one place instead of placing `{dialog.Dialog}`
- `umbra/solid` — the three differences from the React chapter, all of them the renderer's, plus `fromStore`
- `umbra/vanilla` — `bindDialog`, `DialogController`, `bindAction`, reading state without a renderer, and what happens to a `<dialog>` the server sent already open
- `createStore` / `StoreContract` — the zero-dependency reactive cell the library runs on, and the shape a binding consumes
- `dialogManager` — Imperative open/close, and the `lookup` query API
- `prioritize` — who is in front, as one project-wide rule, and the three costs of reordering a modal dialog
- `openAndWait()` — Go-style async result: open, and resolve with how it closed — on a hook, and on `dialogManager` for code with no component
- `requestOpen` / `requestOpenAndWait` — ask a dialog you do not own, and hear the answer
- `dialog:open` / `dialog:close` — DOM lifecycle events, heard across bundles
- `subscribe` — the same two moments plus `register` / `unregister`, so an imperative open can wait for a dialog behind a code-split route
- `normalizeError` — turn whatever was thrown into an `Error`
- Hotkey system (`Key`, `HotkeyDef`, `matchesHotkey`, `formatHotkeyLabel` for a label a person reads, `formatAriaKeyshortcuts` for the value the DOM takes)
- Debug logging

## <img src="docs/brand/moon-last-quarter.svg" width="18" height="18" alt="" /> Reference Templates

The library ships no UI components. Reference implementations live in `playground/src/entities/dialog-template/ui/`: a full **vanilla HTML/CSS** set, since it depends on nothing, and one **MUI** family beside it — the form dialog, kept as the worked proof that a component library's chrome fits over the same hooks. Copy either into your project or write your own.

> **If you write a custom button wrapper**, you must forward three props onto the underlying `<button>` element: `aria-keyshortcuts`, `data-focus-on-open` and `data-action-reason`. All three are how the library finds a button in the DOM — hotkeys dispatch by querying `[aria-keyshortcuts]`, `focusOnOpen` finds its button by `[data-focus-on-open]`, and the focus restore after an action re-queries `[data-action-reason]` when your renderer has replaced the node it ran on. Dropping any one of them makes that feature silently do nothing. A wrapper that spreads `...rest` onto its button already forwards all three. A wrapper that _builds_ `aria-keyshortcuts` instead of forwarding it must build it with `formatAriaKeyshortcuts`, which is the spelling dispatch looks for.

## <img src="docs/brand/moon-first-quarter.svg" width="18" height="18" alt="" /> Debug Logging

```js
// Browser console — enable all namespaces:
localStorage.setItem('dialog:log', '*');

// Specific namespaces:
localStorage.setItem('dialog:log', 'dialog,action');

// Programmatic:
import { setLogLevel } from 'umbra';
setLogLevel('*');
```

| Namespace              | Description                          |
| ---------------------- | ------------------------------------ |
| `manager`              | Registration, stack state            |
| `dialog`               | Open/close/unmount lifecycle         |
| `dialog:lifecycle`     | prepare, showModal, labelling checks |
| `dialog:keydown`       | ESC dismiss, user onKeyDown          |
| `dialog:click-outside` | Click-outside for non-modal dialogs  |
| `outlet`               | DialogOutlet registration            |
| `action`               | Action start/end, state changes      |

## <img src="docs/brand/moon-last-quarter.svg" width="18" height="18" alt="" /> Development

This repo uses **Yarn 4**, pinned via the `packageManager` field and resolved through
[Corepack](https://nodejs.org/api/corepack.html) — run `corepack enable` once, then:

```bash
yarn install         # Install dependencies (--immutable in CI)
yarn dev             # Start playground
yarn build           # Build library (ESM bundle + .d.ts via tsc)
yarn type-check      # TypeScript strict check
yarn test            # Unit + component tests
yarn lint            # oxlint (type-aware)
yarn format          # Prettier
yarn check           # type-check + lint + format + docs, the pre-commit gate
yarn verify:all      # lint + type-check + build + package checks, against the built artifact
```

**Two coverage numbers, because there are two test projects and neither can measure the other's
half.** `yarn test:unit:coverage` measures the framework-free core in Node (c8) — **96.56%**
statements — and its exclude list is the statement of what a Node process can reach, not a way to
flatter the number. `yarn test:component:coverage` measures what that list leaves out: the three
bindings and the DOM-only modules, in a real browser (istanbul, opt-in because instrumenting costs
~45% of the run) — **91.60%** statements over 55 files. Both measured 2026-08-28, and re-measured
together or not at all: one number moved without the other is two projects being compared across
different days. `yarn coverage:update` is that rule made mechanical: it runs both commands and
rewrites this paragraph, the badges above and CLAUDE.md's copy in one move — still a snapshot, not
a gate.

The same pair is quoted in [CLAUDE.md](CLAUDE.md#what-coverage-measures), which is the other half of
"together": this file drifted two points behind it by moving one copy and not the other, which is the
document-level version of the mistake the paragraph above warns about.

## <img src="docs/brand/moon-last-quarter.svg" width="18" height="18" alt="" /> How this repo is run

Friendly warning, so nothing here surprises you: **I commit to `main`.** No release branches, no
deprecation cycles, and **no semver** — a name can change between two commits if a better one
turns up, and it does. The last four naming passes turned `isOpen` into `isVisible`, `onOpen`
into `prepare`, `ModalInfo.modalType` into `template`, and then `useModal` — with the whole surface
around it — into `useDialog`, because each was describing itself inaccurately.

That is a deliberate trade, not neglect. The library is not published, so nobody's build breaks
when a name improves; what you get instead is a surface that says what it means. The day I decide
to publish it, that freedom ends and the usual ceremony starts — versions, a migration note per
break, the lot. Until then the CHANGELOG is the migration guide, organised by date, and it
explains _why_ each name moved rather than only that it did.

If you have lifted code out of `src/`, pin the commit you took it from.

## <img src="docs/brand/moon-full.svg" width="18" height="18" alt="" /> On the tooling

**This library was written by Claude, and directed by nearly 30 years of doing it by hand.** Worth
saying plainly, because the interesting question is not whether an AI can write a dialog manager —
it can write ten before lunch, and nine of them will have `isOpen` meaning three different things
in three files.

The question is whether anyone notices. Every rename in the CHANGELOG is that noticing, written
down: `isOpen` → `isVisible`, because the flag stayed true through the entire exit animation and
the semantics were right — the name was the lie; `onOpen` → `prepare`, because it is work the open
waits on and not a notification; `modalType` → `template`, because the field and the type attribute
it shadowed were each right about something different; `useModal` → `useDialog`, because the library
drives a `<dialog>` and _modal_ is one of that element's two variants, so the hook was named after
half of what it does. No model asked for one of those. The
entry-point isolation tests exist because someone knew, before it happened, exactly how a framework
import sneaks into a framework-free core.

That is the trade this repo makes visible: the tool is extraordinary at the part that used to be
slow, and no judge at all of which of its own output is worth keeping. **The taste is still yours
to supply, and it is still the expensive half.**

## <img src="docs/brand/moon-first-quarter.svg" width="18" height="18" alt="" /> License

[MIT](./LICENSE) © 2026 Francis Desjardins

The source is here to read, copy and learn from. The reference templates and the user-land
patterns under `playground/src/` are meant to be lifted into your own project, which the MIT
terms allow without attribution or ceremony.

---

<div align="center">

<img src="docs/brand/moon-waxing-crescent.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-first-quarter.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-waxing-gibbous.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-full.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-waning-gibbous.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-last-quarter.svg" width="16" height="16" alt="" /> &nbsp; <img src="docs/brand/moon-waning-crescent.svg" width="16" height="16" alt="" />

</div>
