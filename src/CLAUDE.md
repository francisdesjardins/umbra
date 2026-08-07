# Library Source — Architecture & Patterns

## Entry points

- **[index.ts](index.ts)** — the package root: the framework-agnostic dialog manager, the
  store engine, the async helpers, `Key`. **Must resolve without React**, enforced by
  [\_\_tests\_\_/root-react-free.test.ts](__tests__/root-react-free.test.ts).
- **[react.ts](react.ts)** — the React binding: hooks, `ModalOutlet`, the React store
  bindings, the provider. Re-exports the root wholesale so React apps use one specifier.

When adding an export, the default home is the root. It belongs in `react.ts` only if it
imports React as a _value_ — a type-only `import type { CSSProperties } from 'react'` is
erased and stays in the core. If in doubt, add it to the root and let the guard test decide.

A type also belongs at the root if the root's own public surface **refers** to it: `ModalInfo`
is a root export, so `ModalPhase` must be too, or a root consumer cannot annotate what it was
handed. The hook-shaped types (`ModalHandle`, `UseModalOptions`, `UseModalReturn`) stay on
`./react` — they describe rendering a dialog, and nothing at the root can hand you one.

## Import specifiers carry `.js`

**Every relative import in `src/` ends in `.js`** (`'./types.js'`, `'../store/index.js'`) even
though the file on disk is `.ts`/`.tsx`. `tsc` copies relative specifiers into the emitted
`.d.ts` verbatim, and an extensionless one — or a bare directory — is invalid under
`moduleResolution: node16`/`nodenext`. The failure mode is the worst kind: `skipLibCheck: true`
(a common default) suppresses the resolution error, so the imported types degrade to an error
type the checker waves through, and the package appears to type-check while providing no type
safety at all.

Vite resolves `./x.js` to `x.ts`/`x.tsx`, so nothing else changes.
`scripts/verify-package.mjs` fails the build on any extensionless relative specifier in the
built declarations.

## Architecture

Three layers: framework-agnostic core, React binding, headless template hooks.

### Layer 1: Core Primitive

- **`useModal`** ([core/use-modal.tsx](core/use-modal.tsx)) — React binding only; the state machine lives in [core/modal-store.ts](core/modal-store.ts) (`createModalStore`, React-free, exports the `ModalStore` type consumed by `hook-types.ts` and `finalize-close.ts`). Each method is a complete transition rather than a plumbing primitive: `requestOpen(onOpened?)` (owns the start / join-in-flight / resolve-now decision), `scheduleOpenTransition()` (owns its own animation frame — the handle is never exposed, and `close()` cancels it), `resolveOpen`, `close`, `finalize`, `abandon`, `openSignal()` (the `AbortSignal` handed to `onOpen`, aborted by the close), `addCloseResolver`, `setOnClose`/`runOnClose`. The close reason is read off `getSnapshot().closeResult`, not a dedicated getter. The store _runs_ `onClose` rather than handing it back — see the note in `modal-store.ts`; returning it would make `ModalStore<TData>` unassignable to `ModalStore`. Renders `<dialog>` inline (or `createPortal` when `portal: true`). Returns `{ open, isOpen, Modal, waitForClose, handle, dialogManager }` (`handle` = `{ close }` — the modal itself; its buttons come from the `action` factory in the render args). The `dialogManager` property is context-aware — use it for imperative cross-modal operations instead of the static singleton.
  - `<dialog>` uses `display: flex; flex-direction: column`. Sizing is user-land — the `style` prop is the public lever for the box itself (the same one the template hooks pull), and styles for what is inside belong in `render`.
- **`dialogManager`** ([manager/dialog-manager.ts](manager/dialog-manager.ts)) — Factory-based with module-level singleton. Immutable `RegistryEntry` records. Imperative `open(id)`/`close(id)`. Body scroll lock (modal only) via [manager/scroll-lock.ts](manager/scroll-lock.ts), claimed **per manager instance** so a second manager cannot release a lock it never took, `getZIndex(id)` = `1300 + stack position`. Snapshot is `{ openDialogs, foreground }` — `openDialogs` sorted by `openedAt` (index = stack position); counts and blocking/non-blocking splits derive from it (`ModalInfo.nonModal`). Lookup queries read the snapshot, which recomputes synchronously on every store transition.
- **`DialogManagerProvider`** ([manager/dialog-manager-context.tsx](manager/dialog-manager-context.tsx)) — Injects isolated instance. **Test stories only.** Without it, hooks fall back to static singleton.
- **`useDialogManager`** ([manager/use-dialog-manager.ts](manager/use-dialog-manager.ts)) — Reactive hook via `useSyncExternalStore`. Returns `DialogManagerSnapshot` from nearest context or singleton.
- **Types**: [core/types.ts](core/types.ts) — `ModalAnimation`, `ModalHandle`, `ModalRenderArgs`, `UseModalOptions`, `UseModalReturn`, `ModalPhase`, `ModalStoreSnapshot`, `GetDialog`. Also [manager/types.ts](manager/types.ts) — `LookupSnapshot`, `UseLookupOptions`. And [actions/types.ts](actions/types.ts) — `HotkeyDef`, `ActionDefinition`, `ActionButtonProps`, etc.

**Internal hooks** — 2-param convention: `(ctx: ModalHookContext, options)`. Context in [hooks/hook-types.ts](hooks/hook-types.ts): `{ store, getDialog, modalId, phase, dm }`.

- `useDialogLifecycle` ([hooks/use-dialog-lifecycle.ts](hooks/use-dialog-lifecycle.ts)) — Wires the native `<dialog>` DOM lifecycle to store transitions in two effects: (1) opening effect (no deps, always captures latest `onOpen`): `showDialog()`, `store.scheduleOpenTransition()`, `resolveOpen`/`onOpen`; (2) closing/re-measure effect (explicit deps): calls `refreshTransitionsDisabled` on every `'open'` phase (per open, not per element — the `<dialog>` outlives every cycle and its transition config can change between them), on `'closing'`: disabled-transition short-circuit → `runDialogExit()` (WAAPI backdrop + `transitionend` + fallback timeout) → `finalizeModalClose` (`dialog.close()`, `onClose`, `store.finalize()`). `finalized` flag guards against ESC cancel race. The DOM orchestration itself is framework-agnostic — see below.
- **`manager/scroll-lock.ts`** ([manager/scroll-lock.ts](manager/scroll-lock.ts)) — React-free body scroll lock used when any _blocking_ dialog is open. Claimed per owner (`lockBodyScroll(owner)`) and released when the last claim goes — the lock target is one global `<body>` shared by every manager instance, and a shared boolean would make it last-writer-wins. Sets `data-dialog-open` on `<body>` (the injected stylesheet keys `overflow: hidden` off it) and compensates the width the lock **actually reclaims** — `computeScrollCompensation(before, after)`, not the current scrollbar width. That distinction is the whole point: a page with `scrollbar-gutter: stable` keeps its gutter through `overflow: hidden`, so padding by the scrollbar width would shift content inward instead of holding it still. Publishes the amount as `--dialog-scrollbar-width` on `:root` so user-land `position: fixed` elements can compensate too — the library never walks the consumer's DOM looking for them.

### The styling surface

Everything a consumer needs to style a dialog, and nothing that requires knowing how the tree
is built:

- **`--dialog-backdrop`** — the library's one visual opinion, read by its single
  `dialog::backdrop` rule and defaulted to `rgba(0, 0, 0, 0.7)`. Inherited, so setting it on
  `:root`, a theme class or the dialog itself is a declaration rather than a specificity fight
  against an adopted stylesheet.
- **`data-modal-id`** (the modal's id) and **`data-modal-type`** (`'modal'` / `'non-modal'`) on
  the `<dialog>` — how CSS reaches one dialog or every non-blocking one. `data-testid` is for
  tests; it is not a styling contract and must not be documented as one.
- **`style`** — the size of the `<dialog>` box, which the library never decides: a `<dialog>`
  keeps the UA's `fit-content` unless told otherwise. Public, and the same lever the template
  hooks pull; a template's own structural styles are merged _under_ a caller's, so a drawer can
  be told to be 380px wide without rebuilding the hook.
- **`data-loading`** on an action's button props — the running state as a DOM attribute, so a
  plain `<button>` can be styled with `[data-loading='true']`. `loading` is the same flag for a
  button _component_ that declares it (MUI, Mantine); React drops it on a DOM element.

### Naming a dialog

`ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` and `role: 'dialog' | 'alertdialog'` reach
the `<dialog>` element. A dialog with no accessible name is announced as just "dialog" — the
commonest defect in a dialog implementation — and the library cannot invent one, so it takes
the caller's and **omits the attribute entirely when absent**: `aria-label=""` would hide the
omission from an audit.

`role` is deliberately not the whole ARIA surface. A `<dialog>` _is_ a dialog; a surface that is
not one — a toast, a popover — wants a live region **inside** it, not a role contradicting its
own element. The corner-toast example in the playground is written that way and says why.

A **closed** dialog is `display: none`. The UA already says so (`dialog:not([open])`), but the
library's own inline `display: flex` outranks it — and a contained dialog is `inset: 0`, so
without this it stays an invisible, full-region click blocker over whatever it was placed in
front of. `getDialogAnimationStyles` takes the phase for exactly this reason.

- **`core/placement.ts`** ([core/placement.ts](core/placement.ts)) — `dialogPlacement({ nonModal, portal, clip })` → `{ host, dialog }`, the positioning contract as data. Public, from the root: a `showModal()` dialog is placed by the top layer and needs nothing; a portaled non-modal one is `fixed` against the viewport; a contained one is `absolute` against a library-owned host, because inline `fixed` resolves against the nearest transformed ancestor and jumps. `useModal` renders the `host` styles on its wrapper and `getDialogAnimationStyles` merges the `dialog` half, so there is one table rather than a style literal in the JSX and another in a util — and a second binding (or a hand-written host) places a dialog identically.
- **`core/dialog-lifecycle.ts`** ([core/dialog-lifecycle.ts](core/dialog-lifecycle.ts)) — Pure, React-free native-`<dialog>` DOM operations used by the hook above: `showDialog()` (show/showModal + z-index), `refreshTransitionsDisabled()` / `checkTransitionsDisabled()` (WeakMap-cached, re-measured per open), `runDialogExit()` (backdrop WAAPI + `transitionend`/timeout, returns a teardown). Kept out of the hook so the DOM logic is testable in isolation and reusable outside React.
- **`utils/dismiss-gate.ts`** ([utils/dismiss-gate.ts](utils/dismiss-gate.ts)) — `canDismiss({ phase, isPreparing, dismissWhilePreparing, isActionRunning })`, the one predicate every dismissal path shares (dialog-level keydown, non-modal window keydown, click-outside, backdrop click). Each path layers its own check on top (backdrop opt-in, hotkey suppression, foreground, hit testing); nothing else re-implements the shared chain.
- **`utils/animation-utils.ts` → `resolveAnimation()`** — resolves a `ModalAnimation`'s optional fields (`DEFAULT_DURATION` 200, `DEFAULT_TRANSITION_PROPERTY` `'opacity'`) once. Both the inline `transition` on the `<dialog>` and `useDialogLifecycle`'s `transitionend` wait read it, so the declared transition and the listener waiting on it cannot disagree.
- `useDialogKeydown` ([hooks/use-dialog-keydown.ts](hooks/use-dialog-keydown.ts)) — ESC dismiss, prevents native cancel cascade on stacked dialogs
- `useFocusManagement` ([hooks/use-focus-management.ts](hooks/use-focus-management.ts)) — Autofocus capture, clear on close, restore after failed action

### Layer 2: Template Hooks

Each wraps `useModal` with template-specific render context. Shared internals in [templates/shared.ts](templates/shared.ts) (`TemplateCommonOptions`, `TemplateBaseOptions`, `BaseRenderContext`, `DEFAULT_FADE_ANIMATION`).

- `useMessageModal<TData>` ([templates/use-message-modal.tsx](templates/use-message-modal.tsx)) — Context: `ModalRenderArgs` unchanged (`{ isPreparing, handle, action, isRunning, error }`); reports `modalType: 'message'`
- `useSlideModal` ([templates/use-slide-modal.tsx](templates/use-slide-modal.tsx)) — Direction-based animation, reports `modalType: 'slide'`. Context: `ModalRenderArgs & { direction }`. `align?: 'stretch' | 'start' | 'center' | 'end'` (default `stretch`) places the panel on the **cross axis** (perpendicular to the slide): `stretch` fills it edge-to-edge, the others pin a content-sized panel. `center` folds its `-50%` self-shift into both animation keyframes — `transform` is one property and the slide owns it, so a separately-set cross-axis translate would be overwritten.

### Modal Actions

Actions are **declared by being rendered**. `render` is handed an `action` factory; calling it
names the reason, binds the handler and returns the props to spread. There is no config object,
no second hook, and nothing to pass into `useModal`.

- Types in [actions/types.ts](actions/types.ts): `ActionFactory`, `ActionOptions`,
  `ActionButtonProps`, `ActionClickEvent`, `ActionCloseFn`, `HotkeyDef`, `ActionState`.
- **The reason is the action's identity** — it names the action _and_ is the close reason.
  `action('confirm')` closes with `reason: 'confirm'`; nothing restates it. The handler is
  optional: omit it to auto-close with that reason.
- **Declare the reasons on the hook**: `useModal<TData, 'save' | 'cancel'>`. Do this at every
  call site. The `TReason = string` default accepts anything, which costs the three properties
  the design exists for — a mistyped `action('savee')` rejected, autocomplete, and an exhaustive
  `switch (result.reason)` in `onClose`. `'dismiss'` is always in the union: the library produces
  it on Escape, backdrop click and teardown, and an action may also be named it.
- **Close payload** is `useModal<Result>` — with no marker left to carry it, the modal declares
  what it closes with.
- **[actions/action-engine.ts](actions/action-engine.ts)** holds execution and state, React-free.
  `useModal` builds one in the same `useState` initializer as the store and binds it straight to
  `close`, which is why there is no bridge: nothing is handed _in_, so nothing needs bridging.
- **Declaration window**: `useModal` wraps the `render` call in `beginRender()`/`endRender()`, so
  the engine knows which actions the pass drew. Re-declaring per pass rather than accumulating is
  what stops a hotkey outliving its button and going on suppressing the dismiss key.
- The four internal hooks take the engine (as the payload-free `ActionGate`) and read it lazily —
  `ownsHotkey` at keydown, not captured at render, because actions do not exist until render has
  run.
- Aggregated `isRunning` / `error` are pre-computed at write time and reach both the render args
  and the hook's return, so a trigger button outside the dialog can read them.

### Hotkey System

Declared at the action level, automatically wired — no `useHotkey` needed.

```typescript
render: ({ action }) => (
  <>
    <button {...action('cancel', { hotkey: Key.Escape })}>Cancel</button>
    <button {...action('confirm', { hotkey: Key.Enter, onAction: submit })}>OK</button>
  </>
);

```

**Flow:** `action(reason, { hotkey })` records it on the engine during render → `useDialogKeydown` asks the engine to match the event → finds the button by `aria-keyshortcuts` → `click()` runs the same path a real click does.

**`aria-keyshortcuts` forwarding**: Custom button wrappers **must** forward this prop to the `<button>` element or hotkeys silently fail.

```tsx
// ✅ <button aria-keyshortcuts={props['aria-keyshortcuts']} ... />
// ❌ <button ... /> — hotkeys won't fire
```

Utilities: `matchesHotkey()` + `formatHotkeyLabel()` ([utils/hotkey-utils.ts](utils/hotkey-utils.ts)), `Key` constants ([utils/keys.ts](utils/keys.ts)).

**Scoped to the declaring dialog** ([utils/dialog-scope.ts](utils/dialog-scope.ts)). A modal opened
from inside another renders its `<dialog>` in that one's subtree — the documented way to stack,
since the top layer swallows outside clicks — so its events bubble through every modal underneath.
`isOwnEventTarget` drops those at the keydown listener and `queryOwn` keeps dispatch off a nested
dialog's buttons. Without them one Escape unwinds the whole stack and a key two modals both
declare fires at every level it passes.

### Opening focus

`action(reason, { focusOnOpen: true })` emits `data-focus-on-open`, and `useFocusManagement`
focuses that button once the phase reaches `'open'`. The restore target after a failed action is
_not_ that button by default: the hook captures whoever held focus when the action started — the
retry belongs to the button that was pressed — and falls back to the claimed one. It is not React's `autoFocus`: React does not put the native `autofocus` attribute
in the DOM (probed, not assumed), and `showModal()`'s focusing steps read exactly that attribute —
so the library applies the focus itself, after the dialog is actually open.

**Letter case is not significant.** `Key.S` is `'s'` (what `KeyboardEvent.key` reports without Shift), but the browser reports `'S'` while Shift is held — so `matchesHotkey` compares single-character keys case-insensitively and the modifier list does the discriminating. `'Shift+s'` and `'Shift+S'` are one hotkey, and CapsLock cannot change which one fires. `formatHotkeyLabel()` is the canonical form: it is what reaches the DOM as `aria-keyshortcuts`, and `dismissKeyIsOwnedByAction` compares labels rather than raw strings so the three agree by construction.

## Type System

**The model derives; it does not restate.** Adding a field means finding the one type that owns
the concept, not editing three that describe it. The chain, rooted in [core/types.ts](core/types.ts):

```
ModalRenderArgs<TData>                ← the render-time slice:
│                                       { isPreparing, handle, action, isRunning, error }
├── UseModalReturn<TData>   = ModalRenderArgs<TData> & { open, isOpen, Modal, waitForClose,
│                                                        dialogManager }
└── BaseRenderContext<TData>= ModalRenderArgs<TData>               (templates/shared.ts)
    ├── MessageModalRenderContext<TData> = BaseRenderContext<TData>
    └── SlideModalRenderContext<TData>   = BaseRenderContext<TData> & { direction }

UseModalBaseOptions<TData>            ← flat, variant-free option surface
├── UseModalOptions<TData>  = UseModalBaseOptions<TData> & ModalVariant
└── TemplateCommonOptions<TData> = Omit<UseModalBaseOptions<TData>, the 5 a template owns>
    │                              & ModalVariant
    └── TemplateBaseOptions<TData, TRenderContext>
```

`TemplateCommonOptions` is stated as a **complement** on purpose: an option added to
`UseModalBaseOptions` reaches every template hook by default, and only a deliberate edit to the
exclusion list (`id`, `render`, `onClose` — redeclared by `TemplateBaseOptions` — plus
`modalType` and `clipContainer`, which the template sets) keeps it out. Spelled the other way
round, as the enumeration of forwarded keys it replaced, a new core option reached no template
and nothing failed.

So a new render-time field is added to `ModalRenderArgs` **once** and reaches the hook return and
every template context. `isPreparing` carries a subtle caveat (it tracks the `onOpen` callback, not
the `'opening'` phase) that would otherwise be written out three times and drift; it has one home.

### The payload flows

`TData` is not just a label on the hook — it is threaded through every hop of the close path, so
the payload a modal declares is the only payload any of its doors accepts:

```
useModal<TData, TReason>
├── ModalHandle<TData, TReason>.close(reason?: TReason | 'dismiss', data?: TData)
├── ActionFactory<TData, TReason>      ← the `action` in the render args
├── createModalStore<TData, TReason>   → ModalStoreSnapshot.closeResult: CloseResult<TData, TReason>
│                                      → setOnClose / runOnClose / addCloseResolver
└── onClose(result: CloseResult<TData, TReason>)  ·  waitForClose(): [Error, null] | [null, CloseResult]
```

`TReason` defaults to `string`, but **declare it at every call site**
(`useModal<Result, 'save' | 'cancel'>`). It is what rejects `action('savee')`, autocompletes the
reason, constrains `handle.close`, and makes a `switch` on `result.reason` exhaustive.
`'dismiss'` is unioned in throughout — the library produces it on Escape, backdrop click and
teardown.

Three design choices make that possible without a single assertion:

- **`CloseResult<TData>` is a plain object, not a conditional.** Nothing can be assigned to a
  deferred conditional while `TData` is still a parameter, so a conditional here would force a
  cast at every boundary the result crosses. With `TData = void`, `data` is an unusable
  `void | undefined` — the same practical strictness, visible to the checker.
- **The store runs `onClose` (`runOnClose`) instead of returning it.** A `(result: CloseResult<TData>) => …`
  in an output position is checked contravariantly, which would make `ModalStore<TData>`
  unassignable to the plain `ModalStore` that non-generic consumers declare.
- **The hooks take `ActionGate`, not `ActionEngine<TData>`** — the payload-free half of the
  engine. They gate dismissal and dispatch hotkeys; none of them closes _with data_, so none of
  them has to become generic.

Pinned by [core/\_\_tests\_\_/type-model.test.ts](core/__tests__/type-model.test.ts) — compile-time
assertions that the derivations still hold, plus `@ts-expect-error` checks that `ModalVariant`'s
mutual exclusion, the payload rejection, and the action/modal payload match are all real.
Flattening a derived type back into an equivalent-looking literal fails type-check there.

**Declare the payload and the reasons on the hook.** With actions declared by use there is no
marker to carry either, so `useModal<Result, 'save' | 'cancel'>` states both once, at the call.
`type-model.test.ts` asserts what that buys — a mistyped reason rejected, the handle
constrained, `onClose` exhaustive — against the hooks' real signatures via type-only imports
(the file is a unit test; it must not pull React in at runtime), and `verify:package` re-checks
the same guarantees against the published `.d.ts`.

Two deliberate non-derivations:

- **`RegisteredStore`** ([manager/dialog-manager.ts](manager/dialog-manager.ts)) is a _port_ — the
  manager declaring what it needs, not a `Pick<ModalStore, …>` — because the manager is the
  framework-agnostic side of the boundary and a future binding supplies its own store. Its
  snapshot, being shared vocabulary, _is_ `ModalStoreSnapshot`. Contrast
  [core/finalize-close.ts](core/finalize-close.ts), which is handed the real store and so narrows
  it with `Pick`.
- **`ModalVariant`**'s two branches each re-declare `nonModal`, because TypeScript has no way to
  share a doc comment across union members. The prose lives on the union itself; the branches
  summarise and link to it.

- `CloseResult<TData>` — `{ reason, data?: TData }`; `TData = void` makes `data` unassignable
- `waitForClose()` — Go-style `[error, result]` tuple (`WaitForCloseResult<TData>`); the
  `[Error, null]` branch is produced by `store.abandon()`
- `TReason` — the action names **and** the close reasons, since the reason is the identity
- No `as` casts — use `Extract<Source, Target>` for narrowing, `satisfies` to prevent widening

## Generated docs

`yarn docs:check` runs typedoc with `treatWarningsAsErrors` and is part of `yarn check`, so a
broken `{@link}` or a public signature referencing an unexported type fails the gate.

- `notExported` and `invalidLink` are **on**. A type that a public signature mentions but the
  entry point does not export is a real gap — it is how `ActionOptions` was found: a parameter
  type users were asked to pass and could not name.
- `intentionallyNotExported` lists the internal helpers that legitimately appear in a public
  signature's _structure_ without a user ever naming them (`ModalInfoBase`, `RegisteredStore`,
  `BaseRenderContext` …). Adding to it is a decision; check first whether the type should just be
  exported.
- `notDocumented` is **off**. Turning it on flags exactly 67 things, all of them `Key`'s
  constants (`A: 'a'`, `Digit0`, `F12` …), whose names are their documentation. Nothing else in
  the public surface is undocumented — run `yarn docs:check --validation.notDocumented` before
  assuming that is still true.
- `disableSources` is on because there is no git remote yet, so every "view source" link would 404. Turn it off once the repository exists.

**`yarn docs:examples` holds the `@example` blocks to the same gates as the code** — prettier,
`tsc`, eslint — by extracting each one to a real module under `scripts/examples/generated/`
(gitignored) and running the three over it. It is part of `yarn check`;
`yarn docs:examples:fix` writes the formatted example back into the doc comment it came from.

- The examples get [their own tsconfig](../scripts/examples/tsconfig.json): a snippet shows a
  call and stops, so unused locals and implicit `any` are allowed, while everything that decides
  whether it would compile in a user's app — `strict`, `exactOptionalPropertyTypes`, the DOM
  lib — is kept. The eslint scope is the same bargain (scope 3c in `eslint.config.js`).
- Free identifiers (`store`, `fetchUser`, `api`) are declared as `any` by a second pass, so what
  remains is the example using _this_ library wrongly. That is the class of error worth failing
  a build over — the two examples that were wrong when written would both have been caught.
- An example that cannot parse standalone (an elliptical `useModal({ ... })`) is reported and
  still type-checked, not silently skipped.

## React Compiler

`babel-plugin-react-compiler` target `'19'`.

- **No `useMemo`/`useCallback`/`React.memo`** — compiler handles memoization
- **No ref writes during render** — use `useEffect`. Store objects with DOM methods taint as ref-like → use `GetDialog` getter pattern. (`createModalStore` lives in its own module — verified compiler-neutral: `useModal` compiles to the same 88 memo slots imported or colocated.)
- **No property assignment on `useState` values** — `st.x = value` forbidden everywhere. Use closure mutations or `Map.set()` (method calls exempt).
- `open()`, `waitForClose()` and `handle` close over the store alone, so they are built once in `useModal`'s `useState` initializer and are reference-stable — the compiler cannot memoize them for us (it treats the store as opaque), so hoisting is what makes them usable as effect deps. Everything else the hook returns is derived per render.

## Code Organization

1. Side effects → hooks in `hooks/`
2. Pure functions → `utils/`
3. Compiler ref complaints → inline the handler
4. State → the `store/` module ([store/CLAUDE.md](store/CLAUDE.md)) — hand-rolled reactive cell, zero runtime deps
5. Types → `core/types.ts` (modal + close result types), `manager/types.ts` (lookup), `actions/types.ts` (modal actions)
6. Template shared → `templates/shared.ts`
7. Error handling → `normalizeError` (`utils/normalize-error.ts`) is the one general-purpose helper the root exports: it produces the `Error` an action reports, and a caller composing its own handler wants the same normalisation. Async **coordination** — a mutex, single-flight, a fetch-state machine — is user-land and lives in `playground/src/shared/lib/`, demonstrated and copied like the modal templates; a dialog manager is not where anyone looks for a mutex. `fireAndForget` (`utils/fire-and-forget.ts`) is **internal**: it exists for the lifecycle's own detached callbacks and is deliberately not exported
8. Non-React store observation → `store.subscribe(listener)` and read `getSnapshot()`; that pair is the whole contract, and the selector conveniences that used to wrap it are playground reference code now

### State (store module)

State management lives in [store/](store/) — a hand-rolled reactive cell (a `Set` of listeners + `get`/`set`) with **zero runtime dependencies**. It is the single swap point for the engine: reimplement these files to change it. Import store primitives from `../store` internally, or from the package root (`umbra`) in the playground.

**The barrel is safe for every core module to import**, and there is no exception to remember: `src/store/` is the engine and nothing over it, so it imports no React at all. That is what the root's React-freedom rests on — not on tree-shaking a re-export back out.

```ts
import { createStore } from '../store';

const counter = createStore({ count: 0 }, ({ set }) => ({
  increment() {
    set((s) => ({ ...s, count: s.count + 1 }));
  },
}));
counter.increment(); // methods merge at the root, zustand-style — no `actions` wrapper
```

**Two modes:** generic (`createStore(initial)` → `set`/`reset` on the instance) vs domain (with a builder → only your methods; built-ins live on `api`). No reserved keys. **Mutation** is `set(next | (prev) => next)` and `reset()` — there is no draft engine; for nested updates compose immer at the call site (`set(s => produce(s, recipe))`). **Derived state** is computed at the read — `useSyncExternalStore(store.subscribe, () => derive(store.getSnapshot()))` — there is no `createDerivedStore`. See [store/CLAUDE.md](store/CLAUDE.md).

## Debug Logging

`createLogger(namespace)` ([utils/logger.ts](utils/logger.ts)). Enable: `localStorage.setItem('dialog:log', '*')`. Namespaces: `manager`, `outlet`, `modal`, `modal:lifecycle`, `modal:keydown`, `modal:click-outside`, `action`.

## Testing Details

Tests auto-wrapped in `<DialogManagerProvider>` via [playwright/index.tsx](../playwright/index.tsx) — each test gets isolated state.

**Cross-modal in stories** — use `dialogManager` from `useModal` return, not the static singleton:

```tsx
const { Modal, dialogManager } = useModal({ id: 'my-modal', ... });
dialogManager.open('other-modal'); // ✅ context-aware
```

**Harness rules**: Declare at module scope (not inside `test()`). Follow React Compiler constraints.

**Stories page registration**: Export from barrel → add `StoryEntry` in `StoriesPage.tsx` → register `?raw` import in `codeSamples.ts`. A story that is not on the page is invisible — the file still builds and still runs in CT, and nobody can reach it.

The exception is a **parameterised** harness: `StoryEntry.component` is a `ComponentType` with no props, so a harness taking required props (`ActionLoggingHarness`, `AlignSlideHarness`, `ContainedPositioningSlideHarness`) is a test fixture rather than a demo and is deliberately absent. Give it a prop-free default if it is worth showing.

**Selectors**: `<dialog data-testid="modal-{id}">`. Use `getByTestId`/`getByRole` over CSS selectors. Use `{ exact: true }` for partial label matches.

Public API: [index.ts](index.ts).
