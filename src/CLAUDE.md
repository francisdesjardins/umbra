# Library Source — Architecture & Patterns

## Entry points

- **[index.ts](index.ts)** — the package root: the framework-agnostic dialog manager, the
  store engine, the placement and style tables, `Key`. **Must resolve with no framework
  installed**, enforced by [\_\_tests\_\_/entry-isolation.test.ts](__tests__/entry-isolation.test.ts).
- **[react.ts](react.ts)** — the React binding: hooks, `ModalOutlet`, the provider. Re-exports
  the root wholesale so React apps use one specifier.
- **[solid.ts](solid.ts)** — the Solid binding, the same surface. Everything under
  [solid/](solid/); re-exports the root wholesale too.
- **[vanilla.ts](vanilla.ts)** — the controller binding, for a `<dialog>` the caller wrote. No
  framework at all; everything under [vanilla/](vanilla/), and the root re-exported wholesale.

When adding an export, the default home is the root. It belongs in a binding only if it imports
that framework as a _value_ — a type-only `import type { CSSProperties } from 'react'` is erased
and could stay in the core. **It should not**: the root's own `.d.ts` must not name a renderer's
types either, or a Solid-only consumer needs `@types/react` in their tree to read them. That is
why the style type is derived from the DOM (`core/style.ts`) rather than borrowed from React —
see [The two open knobs](#the-two-open-knobs) below.

A type also belongs at the root if the root's own public surface **refers** to it: `ModalInfo`
is a root export, so `ModalPhase` must be too, or a root consumer cannot annotate what it was
handed. The hook-shaped types (`ModalHandle`, `ModalRenderArgs`, `ModalVariant`) are at the root
because they are framework-free; the two that are not — the option and return types — are the
core model instantiated per binding.

### The vocabulary

One act, one word. Four distinctions carry most of the naming weight, and each has exactly one
spelling — a synonym for any of them is a bug report, not a style preference.

| Concept                       | The word                      | Not                                        |
| ----------------------------- | ----------------------------- | ------------------------------------------ |
| `showModal()` vs `show()`     | **modal / non-modal**         | blocking / non-blocking                    |
| Which template built a dialog | **`template`**                | `modalType`, kind, category                |
| An unconditional transition   | **`beginOpen`**               | `requestOpen` (that one asks and may fail) |
| The work gating an open       | **`prepare` / `isPreparing`** | `onOpen` (a notification, not a gate)      |

Two more that are easy to blur:

- **`dialog` is the element, `modal` is the unit of state.** `dialogPlacement`, `dialogAttributes`,
  `DialogStyle` and `dialog-lifecycle.ts` all act on a `<dialog>`; `modal-store.ts`, `ModalPhase`,
  `ModalRenderArgs` and `modalId` are the library's own record of one. `DialogManagerSnapshot.openDialogs`
  holds `RegisteredModalInfo` and so reads against the rule — it stays, because applying the rule
  consistently would rename `DialogManager` itself, and the manager's name is the package's front
  door. Do not add new exceptions; a new name picks the side its subject is on.
- **`sync*` decides, `run*` does.** A `sync*` function (`syncOpenSequence`, `syncCloseSequence`,
  `syncBodyScrollLock`) is handed a phase and may decide there is nothing to do, so it is safe on
  every pass. A `run*` function (`runDialogExit`, `runCloseSequence`) performs what it names, every
  time it is called.

### Where a file goes

The folder names are the architecture's documentation, so a React hook in `core/` is a
contradiction rather than an inconvenience. One rule decides:

| Folder                                                            | Holds                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `core/`, `manager/`, `store/`, `actions/`, `utils/`, `templates/` | Framework-free. Must survive `entry-isolation.test.ts` walking the root.                                                        |
| `react/`, `solid/`                                                | Everything that imports its framework as a value — hooks, components, providers, and the option/return type instantiation.      |
| `vanilla/`                                                        | The controller binding. Framework-free like the core, but a _binding_ rather than a primitive: it composes, it does not decide. |

**Only the two hook bindings mirror each other.** `vanilla/` is a different kind — a controller
over markup the caller owns, with no `render`, no `Modal` and no outlet — so requiring it to match
would be requiring the wrong thing. `binding-parity.test.ts` asserts the mirror for the hook pair
and, separately, what the controller must and must not export.

`react/` and `solid/` mirror each other **file for file** — `use-modal`, `modal-outlet`,
`dialog-manager-context`, `use-dialog-manager`, `use-lookup`, `types.ts` and
`templates/use-{message,slide}-modal` — with one documented exception, `solid/from-store.ts`
(React reads a store through `useSyncExternalStore` and needs no bridge). That mirror is not a
convention to be remembered: [\_\_tests\_\_/binding-parity.test.ts](__tests__/binding-parity.test.ts)
diffs the two entry points' export names _and_ their module paths, so a hook added to one and
forgotten on the other fails, and so does putting it at a different depth.

**It is worth being that strict about the paths**, because the surface can be complete while the
folders lie: `useSlideModal` was exported from `./solid` for a week from inside a combined
`templates.ts`, and the honest reading of a `solid/` folder with no `use-slide-modal` in it was
"Solid does not have one". A `templates/` folder on each side says the other true thing — the two
template hooks are built _on_ `useModal`, not peers of it, and the framework-free half of them
already lives in `src/templates/`.

React's effects are **not** split into per-concern hook files. Their whole content is a dependency
array, and a `react/hooks/` folder holding `use-click-outside.ts` reads as a feature list that
Solid is missing — which is exactly how it was read. Both bindings now wire the same `attach*`
functions inline in their own `use-modal`, in the same order, and the diff between them is
scheduling.

**A test lives next to what it tests, whatever framework its harness uses.** `apply-style.ct.tsx`
tests a core function through a React harness and belongs in `core/__tests__/`; so do the manager's
and the action engine's CT tests. Only tests of a binding's own surface moved to
`react/__tests__/`. Shared harness helpers (`story-styles.ts`) live in `src/__tests__/`, because a
helper used by four folders' stories belongs to none of them.

### What is shared, and what a binding actually does

[core/modal-runtime.ts](core/modal-runtime.ts) holds the parts that were written twice and were
identical both times: `resolveModalOptions` (the defaults _and_ the variant narrowing — reading
`dismissOnBackdropClick` without checking `nonModal` first is a type error here and a
silently-ignored option in a binding that got it wrong), `createModalRuntime` (store, engine,
`open`, `openAndWait`, `handle`), `shouldDismissOnBackdropClick` (the full four-step chain), and
`teardownModal`. `animation` is deliberately _not_ resolved there: its fallback is a concrete
literal that a function generic over the binding's style type could not return, so each binding
keeps the one annotated line.

### What a binding actually does

The short list, and it is the measure of whether the core is doing its job. A binding:

1. builds a `<dialog>` element and puts the shared attributes on it (`core/dialog-props.ts`),
2. subscribes to `createModalStore` and `createActionEngine` the way its framework subscribes,
3. runs the `attach*` functions below from whatever it calls an effect, tearing down with
   whatever it calls a cleanup,
4. writes the computed style (`getDialogAnimationStyles`) onto the element,
5. calls `render` inside `engine.beginRender()` / `engine.endRender()`,
6. registers with the manager and unregisters on teardown.

Everything else — the state machine, the DOM lifecycle, the dismissal rules, focus, hotkeys, the
placement table, the slide geometry, the action factory, the default animation — is shared. The
three shipped bindings differ in about 200 lines each, and none of it is logic.

A **controller** binding does 1, 3 and 6 the same way, replaces 4 with `applyStyle` on the
caller's element, and drops 2 and 5 outright: there is no render pass, so actions are declared by
`bindAction` and retired by the unbind it returns rather than by a declaration window. Its driver
is the store itself, because there is no other clock — which is safe here precisely because there
is no commit timing to race with.

### The two open knobs

`core/types.ts` is generic over exactly two things, because exactly two things differ between
frameworks: the type of a **style object** and the type of a **rendered node**. Each binding pins
them in one small file — [react/types.ts](react/types.ts) says `CSSProperties` and `ReactNode`,
[solid/types.ts](solid/types.ts) says `DialogStyle` and `JSX.Element` — and re-exports the four
resulting types (`ModalAnimation`, `UseModalBaseOptions`, `UseModalOptions`, `UseModalReturn`)
under their ordinary names. A consumer never sees a type parameter.

`DialogStyle` ([core/style.ts](core/style.ts)) is the framework-free default: a mapped type over
the `string`-valued keys of the DOM's own `CSSStyleDeclaration`, so the property list grows with
the platform rather than with an edit. React's `CSSProperties` is assignable to it, which is what
lets `getDialogAnimationStyles<TStyle extends DialogStyle>` take a binding's own style type and
return `DialogStyle & Partial<TStyle>` — an intersection React's `style` prop accepts with no
assertion. `applyStyle` is the other half: the one way to write a style object onto an element,
clearing what the previous one set, for a binding that owns its DOM node instead of describing it.

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

Three layers: framework-agnostic core, the bindings over it, headless template hooks. Layer 1 is
shared by every binding; layers 2 and 3 exist once per binding and are thin.

### Layer 1: Core Primitive

- **`useModal`** ([react/use-modal.tsx](react/use-modal.tsx) for React, [solid/use-modal.ts](solid/use-modal.ts) for Solid) — a binding each; the state machine lives in [core/modal-store.ts](core/modal-store.ts) (`createModalStore`, framework-free, exports the `ModalStore` type consumed by `core/attach-types.ts` and `finalize-close.ts`). Each method is a complete transition rather than a plumbing primitive: `beginOpen(onOpened?)` (owns the start / join-in-flight / resolve-now decision), `scheduleOpenTransition()` (owns its own animation frame — the handle is never exposed, and `close()` cancels it), `finishPreparing()` (`prepare` has settled — clears `isPreparing` and releases the `open()` promises), `close`, `finalize`, `abandon`, `prepareSignal()` (the `AbortSignal` handed to `prepare`, aborted by the close), `addCloseResolver`, `setOnClose`/`runOnClose`. The close reason is read off `getSnapshot().closeResult`, not a dedicated getter. The store _runs_ `onClose` rather than handing it back — see the note in `modal-store.ts`; returning it would make `ModalStore<TData>` unassignable to `ModalStore`. Renders `<dialog>` inline (React portals with `createPortal` when `portal: true`; Solid owns the element and mounts it itself, so its `Modal` is `null` on that branch). Returns `{ open, openAndWait, isVisible, Modal, handle, dialogManager }` — `handle` = `{ close }` (the modal itself; its buttons come from the `action` factory in the render args). `openAndWait` registers the close resolver _before_ requesting the open, and that is why `addCloseResolver` is **not** public: a resolver answers the _next_ close, so one added after a close has landed waits forever, and the surface never lets a caller choose the order. The `dialogManager` property is context-aware — use it for imperative cross-modal operations instead of the static singleton.
  - `<dialog>` uses `display: flex; flex-direction: column`. Sizing is user-land — the `style` prop is the public lever for the box itself (the same one the template hooks pull), and styles for what is inside belong in `render`.
- **`dialogManager`** ([manager/dialog-manager.ts](manager/dialog-manager.ts)) — Factory-based with module-level singleton. Immutable `RegistryEntry` records. Imperative `open(id)`/`close(id)`, plus the asking door: `requestOpen(id, request)` fires and forgets, `requestOpenAndWait(id, request)` returns an `OpenRequestOutcome` — refusal is explicit through `request.refuse(reason)`, acceptance is the default (the manager cannot infer it: the React binding's open is asynchronous), and the accepted branch carries the close. `RegisteredStore` gained `addCloseResolver` for that, erased at `unknown` because a callback in a parameter position is contravariant. Body scroll lock (modal only) via [manager/scroll-lock.ts](manager/scroll-lock.ts), claimed **per manager instance** so a second manager cannot release a lock it never took, `getZIndex(id)` = `1300 + stack position`. Snapshot is `{ openDialogs, foreground }` — `openDialogs` sorted by `openedAt` (index = stack position); counts and the modal/non-modal split derive from it (`ModalInfo.nonModal`). Lookup queries read the snapshot, which recomputes synchronously on every store transition.
- **`DialogManagerProvider`** ([react/dialog-manager-context.tsx](react/dialog-manager-context.tsx)) — Injects isolated instance. **Test stories only.** Without it, hooks fall back to static singleton.
- **`useDialogManager`** ([react/use-dialog-manager.ts](react/use-dialog-manager.ts)) — Reactive hook via `useSyncExternalStore`. Returns `DialogManagerSnapshot` from nearest context or singleton.
- **Types**: [core/types.ts](core/types.ts) — `ModalAnimation`, `ModalHandle`, `ModalRenderArgs`, `UseModalOptions`, `UseModalReturn`, `ModalPhase`, `ModalStoreSnapshot`, `GetDialog`. Also [manager/types.ts](manager/types.ts) — `LookupSnapshot`, `UseLookupOptions`. And [actions/types.ts](actions/types.ts) — `HotkeyDef`, `ActionDefinition`, `ActionButtonProps`, etc.

**The DOM wiring is `attach*` functions, not hooks** — 2-param convention: `(ctx: ModalDomContext, options)`, returning a teardown (or `undefined` when nothing was attached). Context in [core/attach-types.ts](core/attach-types.ts): `{ store, getDialog, modalId, phase, manager }`. React calls them from `useEffect` inside `react/use-modal.tsx`; Solid calls the same functions from `createEffect` + `onCleanup`. The bodies moved unchanged, which is why the component suite was the proof that the extraction was behaviour-preserving.

- `syncOpenSequence` / `syncCloseSequence` ([core/attach-lifecycle.ts](core/attach-lifecycle.ts))
- `attachDialogKeydown` / `attachDialogCancel` / `attachWindowDismissKey` ([core/attach-keydown.ts](core/attach-keydown.ts)) — three listeners with three lifetimes, hence three functions
- `attachClickOutside` ([core/attach-click-outside.ts](core/attach-click-outside.ts))
- `createFocusCoordinator` ([core/attach-focus.ts](core/attach-focus.ts)) — a coordinator rather than a bare function, because where the opening focus landed has to outlive one attachment
- `createActionFactory` ([core/action-factory.ts](core/action-factory.ts)) — see below
- `dialogAttributes` / `isBackdropClick` / `DIALOG_CONTENT_STYLE` ([core/dialog-props.ts](core/dialog-props.ts))

- `syncOpenSequence` / `syncCloseSequence` ([core/attach-lifecycle.ts](core/attach-lifecycle.ts)) — the native `<dialog>` DOM lifecycle, driven by phase: (1) opening — `showDialog()`, `store.scheduleOpenTransition()`, `prepare`/`finishPreparing`, guarded on `phase === 'opening'` and `!dialog.open` so it is safe to call on every pass; (2) `'open'` — `refreshTransitionsDisabled` per open, not per element (the `<dialog>` outlives every cycle and its transition config can change between them); (3) `'closing'` — disabled-transition short-circuit → `runDialogExit()` (WAAPI backdrop + `transitionend` + fallback timeout) → `finalizeModalClose` (`dialog.close()`, `onClose`, `store.finalize()`). A `finalized` flag guards the ESC cancel race. React runs these from two effects; Solid runs them from two `createEffect`s.
- **`manager/scroll-lock.ts`** ([manager/scroll-lock.ts](manager/scroll-lock.ts)) — React-free body scroll lock used when any _modal_ dialog is open. Claimed per owner (`lockBodyScroll(owner)`) and released when the last claim goes — the lock target is one global `<body>` shared by every manager instance, and a shared boolean would make it last-writer-wins. Sets `data-dialog-open` on `<body>` (the injected stylesheet keys `overflow: hidden` off it) and compensates the width the lock **actually reclaims** — `computeScrollCompensation(before, after)`, not the current scrollbar width. That distinction is the whole point: a page with `scrollbar-gutter: stable` keeps its gutter through `overflow: hidden`, so padding by the scrollbar width would shift content inward instead of holding it still. Publishes the amount as `--dialog-scrollbar-width` on `:root` so user-land `position: fixed` elements can compensate too — the library never walks the consumer's DOM looking for them.

### The styling surface

**A hairline flush to the dialog's edge is a trap, and it is worth knowing why before debugging
one.** A `<dialog>` keeps the UA's `fit-content`, so its box lands on a fraction of a pixel, and
`margin: auto` puts both edges off-pixel. A 1px border on content that reaches that edge therefore
occupies the box's last fractional pixel, and how much of it the compositor keeps is not the
author's to decide. Measured on the microfrontend demo: three dialogs at 154.844px, 243.094px and
252.266px wide kept 16%, 91% and 73% of their right border — the first read as plainly missing
while the other two looked fine, from identical markup and identical computed styles. Every
binding is affected equally; the fix is user-land (inset the border a pixel, size the dialog in
whole pixels, or move the border inward) and the `style` option's doc says so.

The symptom is worth recognising too, because it misleads: the border is correct on the first
draw and gone after, and toggling _any_ property in devtools brings it back — both of which read
as a CSS problem and are neither.

Everything a consumer needs to style a dialog, and nothing that requires knowing how the tree
is built:

- **`--dialog-backdrop`** — the library's one visual opinion, read by its single
  `dialog::backdrop` rule and defaulted to `rgba(0, 0, 0, 0.7)`. Inherited, so setting it on
  `:root`, a theme class or the dialog itself is a declaration rather than a specificity fight
  against an adopted stylesheet.
- **`data-modal-id`** (the modal's id) and **`data-modal-type`** (`'modal'` / `'non-modal'`) on
  the `<dialog>` — how CSS reaches one dialog or every non-modal one. `data-testid` is for
  tests; it is not a styling contract and must not be documented as one.
- **`style`** — the size of the `<dialog>` box, which the library never decides: a `<dialog>`
  keeps the UA's `fit-content` unless told otherwise. Public, and the same lever the template
  hooks pull; a template's own structural styles are merged _under_ a caller's, so a drawer can
  be told to be 380px wide without rebuilding the hook.
- **`data-loading`** on an action's button props — the running state, and **the only form the
  library ships it in**. Every field of `ActionButtonProps` is a DOM prop: a core agnostic of the
  UI put into it cannot name the busy flag for one family of component libraries (MUI and Mantine
  say `loading`, another says `busy`, a headless one has none). A plain `<button>` styles on
  `[data-loading='true']`; a wrapper reads the boolean and maps it to its own prop, one line, in
  the only place that knows the answer. The playground's `MuiButton` and `VanillaButton` are that
  seam.

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
- **`utils/dismiss-gate.ts`** ([utils/dismiss-gate.ts](utils/dismiss-gate.ts)) — `canDismiss({ phase, isPreparing, dismissWhilePreparing, hasRunningAction })`, the one predicate every dismissal path shares (dialog-level keydown, non-modal window keydown, click-outside, backdrop click). Each path layers its own check on top (backdrop opt-in, hotkey suppression, foreground, hit testing); nothing else re-implements the shared chain.
- **`utils/animation-utils.ts` → `resolveAnimation()`** — resolves a `ModalAnimation`'s optional fields (`DEFAULT_DURATION` 200, `DEFAULT_TRANSITION_PROPERTY` `'opacity'`) once. Both the inline `transition` on the `<dialog>` and `syncCloseSequence`'s `transitionend` wait read it, so the declared transition and the listener waiting on it cannot disagree.
- `attachDialogKeydown` / `attachDialogCancel` / `attachWindowDismissKey` ([core/attach-keydown.ts](core/attach-keydown.ts)) — dismiss key, native cancel cascade guard on stacked dialogs, and the window-level listener a non-modal panel needs
- `createFocusCoordinator` ([core/attach-focus.ts](core/attach-focus.ts)) — opening-focus capture, clear on close, restore after a failed action

### Layer 2: Template Hooks

Each wraps `useModal` with template-specific render context. Shared internals in [templates/shared.ts](templates/shared.ts) (`TemplateCommonOptions`, `TemplateBaseOptions`, `BaseRenderContext`, `DEFAULT_FADE_ANIMATION`, `buildModalOptions`), and the slide panel's geometry — its transforms and its positioning — in [templates/slide-geometry.ts](templates/slide-geometry.ts), which is framework-free and read by both bindings' `useSlideModal`. Solid's two templates are in [solid/templates.ts](solid/templates.ts) and are the same three lines each.

`buildModalOptions` needs its type arguments spelled out at every call site: `TemplateBaseOptions` is an `Omit`, and TypeScript cannot infer through a mapped type, so left alone the style and node parameters fall back to their framework-free defaults and the result stops being that binding's options.

- `useMessageModal<TData>` ([react/use-message-modal.tsx](react/use-message-modal.tsx)) — Context: `ModalRenderArgs` unchanged (`{ isPreparing, handle, action, hasRunningAction, error }`); reports `template: 'message'`
- `useSlideModal` ([react/use-slide-modal.tsx](react/use-slide-modal.tsx)) — Direction-based animation, reports `template: 'slide'`. Context: `ModalRenderArgs & { direction }`. `align?: 'stretch' | 'start' | 'center' | 'end'` (default `stretch`) places the panel on the **cross axis** (perpendicular to the slide): `stretch` fills it edge-to-edge, the others pin a content-sized panel. `center` folds its `-50%` self-shift into both animation keyframes — `transform` is one property and the slide owns it, so a separately-set cross-axis translate would be overwritten.

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
- **Close payload** is `useModal<Result>` — there is nothing else to carry it, so the modal declares
  what it closes with.
- **[actions/action-engine.ts](actions/action-engine.ts)** holds execution and state,
  framework-free. `useModal` builds one alongside the store and binds it straight to `close`,
  which is why there is no bridge: nothing is handed _in_, so nothing needs bridging.
- **[core/action-factory.ts](core/action-factory.ts)** builds the `action` function itself, and it
  is shared. **Its three live fields are getters** (`disabled`, `data-loading`, `aria-busy`) —
  that is what lets one factory serve both bindings: a virtual-DOM renderer spreads the object
  during render and reads them once, which is the snapshot it wanted, while a fine-grained one
  spreads it inside a tracking scope and subscribes each attribute individually. The engine state
  is read through a `readState` callback the binding supplies, not from the engine's own getters,
  because only the binding knows what "reactively" means for it.
- **Declaration window**: `useModal` wraps the `render` call in `beginRender()`/`endRender()`, so
  the engine knows which actions the pass drew. Re-declaring per pass rather than accumulating is
  what stops a hotkey outliving its button and going on suppressing the dismiss key.
- **`undeclare` is the fine-grained half of that.** A pass is a React concept: Solid never re-runs
  the parent, so a button removed by its own `<Show>` has to retire its own declaration, which the
  Solid factory does from `onCleanup`. It is not only a stale hotkey — `hasActions()` decides
  whether a backdrop click dismisses, so without it a modal that has drawn its last action stays
  silently opt-in. Pinned by a Solid component test.
- The `attach*` functions take the engine (as the payload-free `ActionGate`) and read it lazily —
  `ownsHotkey` at keydown, not captured at render, because actions do not exist until render has
  run.
- Aggregated `hasRunningAction` / `error` are pre-computed at write time and reach both the render args
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

**Flow:** `action(reason, { hotkey })` records it on the engine during render → `attachDialogKeydown` asks the engine to match the event → finds the button by `aria-keyshortcuts` → `click()` runs the same path a real click does.

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

`action(reason, { focusOnOpen: true })` emits `data-focus-on-open`, and the focus coordinator
focuses that button once the phase reaches `'open'`. The restore target after a failed action is
_not_ that button by default: the hook captures whoever held focus when the action started — the
retry belongs to the button that was pressed — and falls back to the claimed one. It is not React's `autoFocus`: React does not put the native `autofocus` attribute
in the DOM (probed, not assumed), and `showModal()`'s focusing steps read exactly that attribute —
so the library applies the focus itself, after the dialog is actually open.

**Letter case is not significant.** `Key.S` is `'s'` (what `KeyboardEvent.key` reports without Shift), but the browser reports `'S'` while Shift is held — so `matchesHotkey` compares single-character keys case-insensitively and the modifier list does the discriminating. `'Shift+s'` and `'Shift+S'` are one hotkey, and CapsLock cannot change which one fires. `formatHotkeyLabel()` is the canonical form: it is what reaches the DOM as `aria-keyshortcuts`, and `engine.ownsHotkey` compares labels rather than raw strings so the three agree by construction.

## Type System

**The model derives; it does not restate.** Adding a field means finding the one type that owns
the concept, not editing three that describe it. The chain, rooted in [core/types.ts](core/types.ts):

```
ModalRenderArgs<TData>                ← the render-time slice:
│                                       { isPreparing, handle, action, hasRunningAction, error }
├── UseModalReturn<TData>   = ModalRenderArgs<TData> & { open, openAndWait, isVisible, Modal,
│                                                        dialogManager }
└── BaseRenderContext<TData>= ModalRenderArgs<TData>               (templates/shared.ts)
    ├── MessageModalRenderContext<TData> = BaseRenderContext<TData>
    └── SlideModalRenderContext<TData>   = BaseRenderContext<TData> & { direction }

UseModalBaseOptions<TData, …, TStyle, TNode>   ← flat, variant-free option surface
├── UseModalOptions<…>      = UseModalBaseOptions<…> & ModalVariant
│   ├── react/types.ts      = …<CSSProperties, ReactNode>     ← exported as `UseModalOptions`
│   └── solid/types.ts      = …<DialogStyle, JSX.Element>     ← exported as `UseModalOptions`
└── TemplateCommonOptions<…> = Omit<UseModalBaseOptions<…>, the 5 a template owns>
    │                          & ModalVariant
    └── TemplateBaseOptions<TData, TRenderContext, …>
```

The two trailing parameters are the whole of what a binding contributes to the model, and they
carry defaults (`DialogStyle`, `unknown`) so the core's own code never spells them. A consumer
never sees them either: each binding re-exports the instantiation under the plain name.

`TemplateCommonOptions` is stated as a **complement** on purpose: an option added to
`UseModalBaseOptions` reaches every template hook by default, and only a deliberate edit to the
exclusion list (`id`, `render`, `onClose` — redeclared by `TemplateBaseOptions` — plus
`template` and `clipContainer`, which the template sets) keeps it out. Spelled the other way
round, as the enumeration of forwarded keys it replaced, a new core option reached no template
and nothing failed.

So a new render-time field is added to `ModalRenderArgs` **once** and reaches the hook return and
every template context. `isPreparing` carries a subtle caveat (it tracks the `prepare` callback, not
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
└── onClose(result: CloseResult<TData, TReason>)  ·  openAndWait(): [Error, null] | [null, CloseResult]
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

**Declare the payload and the reasons on the hook.** With actions declared by use, nothing else
carries either, so `useModal<Result, 'save' | 'cancel'>` states both once, at the call.
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
- `openAndWait()` — Go-style `[error, result]` tuple (`AwaitedClose<TData>`); the
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
- All three entry points are in `entryPoints`, and the four core option/return types are listed in
  `intentionallyNotExported` **by qualified name** (`umbra/src/core/types.ts:UseModalOptions`) —
  the plain name would also silence the two bindings' exported ones, which is exactly the warning
  worth keeping.
- **The playground's `/api` reference covers `umbra` and `umbra/react` only.** Its projection keys
  declarations by bare symbol name, and the two bindings deliberately export the same names, so a
  third entry would collide silently and show one binding's signature under the other's specifier.
  The plugin therefore passes its own `--entryPoints` rather than taking typedoc's. Documenting
  `umbra/solid` there needs the model keyed by `specifier:name` first, which reaches the category
  table, the anchors and the search index.

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
- `open()`, `openAndWait()` and `handle` close over the store alone, so they are built once in `useModal`'s `useState` initializer and are reference-stable — the compiler cannot memoize them for us (it treats the store as opaque), so hoisting is what makes them usable as effect deps. Everything else the hook returns is derived per render.

## Code Organization

1. Side effects → an `attach*` function in `core/` (framework-free, returns its teardown), called inline from each binding's `use-modal` — `useEffect` for React, `createEffect` + `onCleanup` for Solid. A new one goes in the core even if only one binding needs it today — the second binding is the reason the first is written that way
2. Pure functions → `utils/`
3. Compiler ref complaints → inline the handler
4. State → the `store/` module ([store/CLAUDE.md](store/CLAUDE.md)) — hand-rolled reactive cell, zero runtime deps
5. Types → `core/types.ts` (the framework-free model, generic over style and node), `react/types.ts` and `solid/types.ts` (the two instantiations), `core/style.ts` (`DialogStyle`), `manager/types.ts` (lookup), `actions/types.ts` (modal actions)
6. Template shared → `templates/shared.ts`
7. Error handling → `normalizeError` (`utils/normalize-error.ts`) is the one general-purpose helper the root exports: it produces the `Error` an action reports, and a caller composing its own handler wants the same normalisation. Async **coordination** — a mutex, single-flight, a fetch-state machine — is user-land and lives in `playground/src/shared/lib/`, demonstrated and copied like the modal templates; a dialog manager is not where anyone looks for a mutex. `fireAndForget` (`utils/fire-and-forget.ts`) is **internal**: it exists for the lifecycle's own detached callbacks and is deliberately not exported
8. Framework-free store observation → `store.subscribe(listener)` and read `getSnapshot()`; that pair is the whole contract. React consumes it through `useSyncExternalStore` with no adapter; Solid's is `fromStore` (`solid/from-store.ts`), six lines, and public because every Solid consumer would otherwise write it

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

Tests auto-wrapped in `<DialogManagerProvider>` via [playwright/index.tsx](../playwright/index.tsx) — each test gets isolated state. That wrapper is **React's**, so a Solid harness wraps itself in Solid's `DialogManagerProvider` or its modals register with the module-level singleton and leak between tests.

**Solid harnesses** ([solid/\_\_tests\_\_/](solid/__tests__/)) are a Solid root hosted inside a React CT story: the story renders a `<div>`, calls Solid's `render` into it from an effect, and returns the disposer as the cleanup. They are written with `h` (`solid-js/h`) rather than JSX, so no Solid compiler enters the CT bundle — and nothing is lost, because hyperscript detects the getters an action's props carry (through the property descriptor) and spreads them reactively, exactly as compiled JSX would.

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
