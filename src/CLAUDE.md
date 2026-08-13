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
| Closed with nobody acting     | **`DISMISS_REASON`**          | a `'dismiss'` literal anywhere in `src/`   |
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

Two near-misses, considered and kept, so the next pass does not re-open them. `ActionGate` and
`DismissGate` are "gate" in two senses — a narrowed view of the engine, and the inputs to one
predicate — and the alternatives (`ReadonlyActionEngine`, `CanDismissOptions`) each cost more than
the ambiguity does. `ModalRenderArgs` and `BaseRenderContext` are two words for one shape on
purpose: the alias is the seam `SlideModalRenderContext` intersects, and "args" is right for a
callback's parameter where "context" is right for what a template hands its render.

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

React's effects are **not** split into per-concern hook files. A `react/hooks/` folder holding
`use-click-outside.ts` reads as a feature list that Solid is missing — which is exactly how it was
read. Both hook bindings run the whole lifecycle through **one** deps-free call into
[core/modal-director.ts](core/modal-director.ts), so the order is not theirs to write and the diff
between them is scheduling.

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
3. calls `director.sync(pass)` from whatever it calls an effect and `director.destroy()` from
   whatever it calls a cleanup — the `attach*` functions and their order are the director's,
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

An index of where each concern lives. The reasoning for each is in its own file's doc comment; what
belongs here is only which file to open.

- **`useModal`** — [react/use-modal.tsx](react/use-modal.tsx),
  [solid/use-modal.ts](solid/use-modal.ts). Returns
  `{ open, openAndWait, isVisible, Modal, handle, dialogManager }`; `handle` is `{ close }`, and the
  buttons come from the `action` factory in the render args. Use the returned `dialogManager` for
  cross-modal calls, not the static singleton — it is context-aware. `<dialog>` is
  `display: flex; flex-direction: column`, and sizing is user-land through `style`.
- **The state machine** — [core/modal-store.ts](core/modal-store.ts), framework-free. Each method is a
  complete transition rather than a plumbing primitive: `beginOpen`, `scheduleOpenTransition`,
  `finishPreparing`, `close`, `finalize`, `abandon`, `prepareSignal`, `setOnClose` / `runOnClose`. The
  close reason is read off `getSnapshot().closeResult`. **`addCloseResolver` is not public**: a
  resolver answers the _next_ close, so one added after a close has landed waits forever — which is
  why `openAndWait` registers it before requesting the open and the surface never lets a caller choose
  the order.
- **`dialogManager`** — [manager/dialog-manager.ts](manager/dialog-manager.ts). Factory plus a
  module-level singleton, immutable `RegistryEntry` records, `open(id)` / `close(id)`, and the asking
  door: `requestOpen` fires and forgets while `requestOpenAndWait` returns an `OpenRequestOutcome`
  (refusal is explicit through `request.refuse(reason)`; acceptance is the default, because the
  manager cannot infer it from an asynchronous open). Snapshot is `{ openDialogs, foreground }` and
  recomputes synchronously on every store transition; `getZIndex(id)` is `1300 + stack position`.
- **The stack order** — [manager/stack-order.ts](manager/stack-order.ts). `prioritize(priority)`
  installs one policy per manager and returns its disposer. `orderStack` sorts on **three** keys:
  modality (non-modal under modal — the platform's rule, not the policy's to overrule), then the rank,
  then `openSequence`. `planRaises` answers _what has to move_, because moving a modal dialog inside
  the top layer is `close()` + `showModal()` and nothing cheaper. The DOM half is `raiseDialog` in
  [core/dialog-lifecycle.ts](core/dialog-lifecycle.ts), whose doc lists the three unavoidable costs.
  `syncStackOrder(shownId?)` is public for a timing reason: the manager observes stores, and a store at
  `'opening'` has not been shown yet.
- **Body scroll lock** — [manager/scroll-lock.ts](manager/scroll-lock.ts), modal only, claimed **per
  manager instance** so a second manager cannot release a lock it never took. It compensates the width
  the lock _actually reclaims_, not the current scrollbar width, and publishes it as
  `--dialog-scrollbar-width`.
- **`DialogManagerProvider`** ([react/dialog-manager-context.tsx](react/dialog-manager-context.tsx)) —
  an isolated instance, for **test stories**. Without it, hooks fall back to the singleton.
- **`useDialogManager`** ([react/use-dialog-manager.ts](react/use-dialog-manager.ts)) — reactive via
  `useSyncExternalStore`.
- **Types** — [core/types.ts](core/types.ts), [manager/types.ts](manager/types.ts),
  [actions/types.ts](actions/types.ts).

**The DOM wiring is `attach*` functions, not hooks** — `(ctx: ModalDomContext, options)`, returning a
teardown (or `undefined` when nothing was attached). **Who calls them, in what order, and on which
pass is [core/modal-director.ts](core/modal-director.ts)'s**, whose JSDoc is where that reasoning
lives — including why each step declares its own inputs rather than sharing one key:

- `syncOpenSequence` / `syncCloseSequence` ([core/attach-lifecycle.ts](core/attach-lifecycle.ts)) —
  the native lifecycle, driven by phase, with a `finalized` flag guarding the ESC cancel race
- `attachDialogKeydown` / `attachDialogCancel` / `attachWindowDismissKey`
  ([core/attach-keydown.ts](core/attach-keydown.ts)) — three listeners with three lifetimes
- `attachClickOutside` ([core/attach-click-outside.ts](core/attach-click-outside.ts))
- `attachFocusContainment` ([core/attach-focus-containment.ts](core/attach-focus-containment.ts)) —
  the Tab wrap `show()` does not give a dialog, opt-in through `containFocus`
- `createFocusCoordinator` ([core/attach-focus.ts](core/attach-focus.ts)) — a coordinator, because
  where the opening focus landed has to outlive one attachment. Owned by the director; no binding
  builds one
- `createActionFactory` ([core/action-factory.ts](core/action-factory.ts))
- `dialogAttributes` / `setDialogAttributes` / `isBackdropClick` / `DIALOG_CONTENT_STYLE`
  ([core/dialog-props.ts](core/dialog-props.ts))
- `dialogPlacement` ([core/placement.ts](core/placement.ts)) — the positioning contract as data, and
  public from the root, so a hand-written host places a dialog identically
- `canDismiss` ([utils/dismiss-gate.ts](utils/dismiss-gate.ts)) — the one predicate every dismissal
  path shares; each path layers its own check on top and nothing re-implements the chain
- `resolveAnimation` ([utils/animation-utils.ts](utils/animation-utils.ts)) — read by both the inline
  `transition` and the `transitionend` wait, so the two cannot disagree

### The styling surface

Everything a consumer needs to style a dialog, and nothing that requires knowing how the tree is
built:

- **`--dialog-backdrop`** — the library's one visual opinion, read by its single `dialog::backdrop`
  rule, default `rgba(0, 0, 0, 0.7)`. Inherited, so setting it anywhere is a declaration rather than
  a specificity fight. **The sheet is adopted per _root_, not per document** — see
  [core/dialog-styles.ts](core/dialog-styles.ts) and `showDialog`.
- **`data-modal-id`** and **`data-modal-type`** (`'modal'` / `'non-modal'`) on the `<dialog>` — how
  CSS reaches one dialog or every non-modal one. `data-testid` is for tests and is **not** a styling
  contract.
- **`style`** — the size of the `<dialog>` box, which the library never decides. The same lever the
  template hooks pull; a template's structural styles merge _under_ a caller's.
- **`data-loading`** on an action's button props — the running state, and the only form the library
  ships it in. A core agnostic of the UI cannot name the busy flag for one component library (MUI
  says `loading`, another `busy`, a headless one has none), so a wrapper maps it in the one place
  that knows. The playground's `MuiButton` and `VanillaButton` are that seam.

**Three platform traps live on the `style` option's doc in [core/types.ts](core/types.ts)**, because
that is where a caller meets them, and each reaches the consumer's own box rather than the library's:
a hairline flush to the dialog's edge draws partially (`fit-content` + `margin: auto` put the box on
a fractional pixel); `dialog:modal` gets a UA `max-width: calc(100% - 6px - 2em)` that cuts a
`min(600px, 92vw)` panel on a phone; and `dialog:modal` is `overflow: auto`, so it clips a focus ring
drawn outside a control's box and needs `scroll-padding` rather than padding. A **non-modal** dialog
gets none of the three, so `nonModal: true` silently changes what a caller's sizing means.

A **closed** dialog is `display: none`. The UA says so, but the library's inline `display: flex`
outranks it — and a contained dialog is `inset: 0`, so without this it stays an invisible,
full-region click blocker. `getDialogAnimationStyles` takes the phase for exactly that.

### Naming a dialog

`ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` and `role: 'dialog' | 'alertdialog'` reach the
`<dialog>`. A dialog with no accessible name is announced as just "dialog", and the library cannot
invent one — so it takes the caller's and **omits the attribute entirely when absent**, because
`aria-label=""` would hide the omission from an audit.

`role` is deliberately not the whole ARIA surface: a `<dialog>` _is_ a dialog, and a surface that is
not one — a toast, a popover — wants a live region **inside** it rather than a role contradicting its
element. **`role: 'alertdialog'` does not require `ariaDescribedBy`**, and making it a type error was
considered and rejected — the reasoning (the APG says to omit a description when the content has
semantic structure, and `umbra/vanilla` would contradict the rule outright) is on the rule itself in
[core/dialog-labelling.ts](core/dialog-labelling.ts).

**The diagnostic that _is_ shipped** is `syncLabellingDiagnostics`
([core/attach-lifecycle.ts](core/attach-lifecycle.ts)) over that rule. It reports two unambiguous
things — an `aria-labelledby` / `aria-describedby` whose ids resolve to nothing, and a dialog with no
accessible name — and, like every warning here, is **silent until `setLogLevel`**. Three details are
load-bearing and written next to the code: it reads the **element**, not the options (in
`umbra/vanilla` the markup is the caller's); it stays quiet until `prepare` settles (a name may point
at a heading not rendered yet); and it allows one frame of slack.

**`aria-busy` is the one attribute the library owns rather than relays**, and the only one that
toggles — so it is always written, `'false'` included, and `isPreparing` is **required** on
`DialogAttributeOptions`. `setDialogAttributes` skips `undefined` rather than removing, which is a
contract and not an optimisation: in `umbra/vanilla` an `aria-labelledby` the caller wrote must
survive an option they never passed. `bindAction` has the same asymmetry from the other side — its
unbind **restores** what it found, or a button the caller had disabled comes back switched on. See
[core/dialog-props.ts](core/dialog-props.ts).

### Layer 2: Template Hooks

Each wraps `useModal` with template-specific render context. Shared internals in [templates/shared.ts](templates/shared.ts) (`TemplateCommonOptions`, `TemplateBaseOptions`, `BaseRenderContext`, `DEFAULT_FADE_ANIMATION`, `buildModalOptions`), and the slide panel's geometry — its transforms and its positioning — in [templates/slide-geometry.ts](templates/slide-geometry.ts), which is framework-free and read by both bindings' `useSlideModal`. Solid's two templates are in [solid/templates/](solid/templates/) and are the same three lines each.

`buildModalOptions` needs its type arguments spelled out at every call site: `TemplateBaseOptions` is an `Omit`, and TypeScript cannot infer through a mapped type, so left alone the style and node parameters fall back to their framework-free defaults and the result stops being that binding's options.

- `useMessageModal<TData>` ([react/templates/use-message-modal.tsx](react/templates/use-message-modal.tsx)) — Context: `ModalRenderArgs` unchanged (`{ isPreparing, handle, action, hasRunningAction, error }`); reports `template: 'message'`
- `useSlideModal` ([react/templates/use-slide-modal.tsx](react/templates/use-slide-modal.tsx)) — Direction-based animation, reports `template: 'slide'`. Context: `ModalRenderArgs & { direction }`. `align?: 'stretch' | 'start' | 'center' | 'end'` (default `stretch`) places the panel on the **cross axis** (perpendicular to the slide): `stretch` fills it edge-to-edge, the others pin a content-sized panel. `center` folds its `-50%` self-shift into both animation keyframes — `transform` is one property and the slide owns it, so a separately-set cross-axis translate would be overwritten.

### Modal Actions

Actions are **declared by being rendered**. `render` is handed an `action` factory; calling it names
the reason, binds the handler and returns the props to spread. There is no config object, no second
hook, and nothing to pass into `useModal`.

- **The reason is the action's identity** — it names the action _and_ is the close reason.
  `action('confirm')` closes with `reason: 'confirm'`; the handler is optional, and omitting it
  auto-closes with that reason.
- **Declare the reasons on the hook**: `useModal<TData, 'save' | 'cancel'>`, at every call site. The
  `TReason = string` default accepts anything, which costs the three things the design exists for — a
  mistyped `action('savee')` rejected, autocomplete, and an exhaustive `switch` in `onClose`.
- **Close payload** is `useModal<Result>`: nothing else carries it, so the modal declares it.
- **`'dismiss'` is reserved, and the reservation is a type**
  ([core/dismiss-reason.ts](core/dismiss-reason.ts)). Actions take
  `ActionReason<TReason> = Exclude<TReason, DismissReason>`, so no action may be _named_ it — and the
  type only half-delivers, because `Exclude<string, 'dismiss'>` is `string`. `engine.declare` warns
  for that case. `handle.close('dismiss')` stays legal: reporting a dismissal is not declaring an
  action.
- **[actions/action-engine.ts](actions/action-engine.ts)** holds execution and state, framework-free.
  `useModal` builds one alongside the store and binds it straight to `close`, so nothing is handed
  _in_ and nothing needs bridging.
- **[core/action-factory.ts](core/action-factory.ts)** builds the `action` function, shared, and
  **its three live fields are getters** (`disabled`, `data-loading`, `aria-busy`) — which is what lets
  one factory serve a virtual-DOM renderer that reads them once and a fine-grained one that
  subscribes each. `action.isRunning(reason)` is built there over the same `readState`, so neither
  hook binding contributes a line; `./vanilla` has no factory, so the controller carries the noun as
  `isActionRunning(reason)`.
- **The declaration window** is `beginRender()` / `endRender()` around `render`, so the engine knows
  which actions the pass drew. Re-declaring per pass rather than accumulating is what stops a hotkey
  outliving its button. **`undeclare` is the fine-grained half**: Solid never re-runs the parent, so a
  button removed by its own `<Show>` retires its own declaration from `onCleanup` — and it is not only
  a stale hotkey, since `hasActions()` decides whether a backdrop click dismisses.
- The `attach*` functions take the engine as the payload-free `ActionGate` and read it lazily —
  `ownsHotkey` at keydown, not at render, because actions do not exist until render has run.
- Aggregated `hasRunningAction` / `error` are pre-computed at write time and reach both the render
  args and the hook's return, so a trigger button outside the dialog can read them.

### Hotkey System

Declared at the action level, wired automatically — there is no `useHotkey`.

```typescript
render: ({ action }) => (
  <>
    <button {...action('cancel', { hotkey: Key.Escape })}>Cancel</button>
    <button {...action('confirm', { hotkey: Key.Enter, onAction: submit })}>OK</button>
  </>
);
```

**Flow:** `action(reason, { hotkey })` records it on the engine during render → `attachDialogKeydown`
asks the engine to match the event → the button is found by `aria-keyshortcuts` → `click()` runs the
same path a real click does.

**`aria-keyshortcuts` forwarding**: a custom button wrapper **must** forward the prop to the
`<button>`, or its hotkeys silently fail. Same for `data-focus-on-open`.

**The attribute is not the label**, and the three spellings agree by construction rather than by
convention: `formatAriaKeyshortcuts` produces the `KeyboardEvent.key` form that reaches the DOM, the
dispatch selector is built from it, and `engine.ownsHotkey` compares it — a spelling that drifted
between them would leave every modified hotkey dead. `formatHotkeyLabel` produces the human form
(`Ctrl+Enter`), and both share one `serialize` so their modifier ordering cannot diverge. Letter case
is not significant; the details are in [utils/hotkey-utils.ts](utils/hotkey-utils.ts).

**Scoped to the declaring dialog** ([utils/dialog-scope.ts](utils/dialog-scope.ts)). A modal opened
from inside another renders its `<dialog>` in that subtree, so its events bubble through every modal
underneath: `isOwnEventTarget` drops those at the keydown listener and `queryOwn` keeps dispatch off a
nested dialog's buttons. Without them one Escape unwinds the whole stack.

### Opening focus

`action(reason, { focusOnOpen: true })` emits `data-focus-on-open`, and the focus coordinator
focuses that button once the phase reaches `'open'`. The restore target after a failed action is
_not_ that button by default: the hook captures whoever held focus when the action started — the
retry belongs to the button that was pressed — and falls back to the claimed one. It is not React's `autoFocus`: React does not put the native `autofocus` attribute
in the DOM (probed, not assumed), and `showModal()`'s focusing steps read exactly that attribute —
so the library applies the focus itself, after the dialog is actually open.

**Letter case is not significant.** `Key.S` is `'s'` (what `KeyboardEvent.key` reports without Shift), but the browser reports `'S'` while Shift is held — so `matchesHotkey` compares single-character keys case-insensitively and the modifier list does the discriminating. `'Shift+s'` and `'Shift+S'` are one hotkey, and CapsLock cannot change which one fires. `formatAriaKeyshortcuts()` is the canonical form: it is what reaches the DOM as `aria-keyshortcuts`, what the dispatch selector is built from, and what `engine.ownsHotkey` compares rather than raw strings — so the three agree by construction. The two formatters share one `serialize`, which is what keeps their modifier ordering from drifting.

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

`TData` is threaded through every hop of the close path, so the payload a modal declares is the only
one any of its doors accepts:

```
useModal<TData, TReason>
├── ModalHandle<TData, TReason>.close(reason?: TReason | 'dismiss', data?: TData)
├── ActionFactory<TData, TReason>      ← the `action` in the render args
├── createModalStore<TData, TReason>   → ModalStoreSnapshot.closeResult: CloseResult<TData, TReason>
└── onClose(result: CloseResult<TData, TReason>)  ·  openAndWait(): [Error, null] | [null, CloseResult]
```

Three design choices make that work without a single assertion, and each is a trap if reversed:

- **`CloseResult<TData>` is a plain object, not a conditional.** Nothing can be assigned to a deferred
  conditional while `TData` is a parameter, so a conditional would force a cast at every boundary the
  result crosses. With `TData = void`, `data` is an unusable `void | undefined` — the same strictness,
  visible to the checker.
- **The store _runs_ `onClose` (`runOnClose`) instead of returning it.** A callback in an output
  position is checked contravariantly, which would make `ModalStore<TData>` unassignable to the plain
  `ModalStore` non-generic consumers declare.
- **The hooks take `ActionGate`, not `ActionEngine<TData>`** — none of them closes _with data_, so none
  has to become generic.

Two deliberate non-derivations. **`RegisteredStore`** is a _port_ — the manager declaring what it
needs, not a `Pick<ModalStore, …>` — because a future binding supplies its own store; contrast
[core/finalize-close.ts](core/finalize-close.ts), which is handed the real store and narrows with
`Pick`. And **`ModalVariant`**'s two branches each re-declare `nonModal`, because TypeScript cannot
share a doc comment across union members.

Pinned by [core/\_\_tests\_\_/type-model.test.ts](core/__tests__/type-model.test.ts) — compile-time
assertions that the derivations hold, plus `@ts-expect-error` checks that `ModalVariant`'s mutual
exclusion and the payload rejection are real. Flattening a derived type into an equivalent-looking
literal fails there, and `verify:package` re-checks the same guarantees against the published `.d.ts`.

- `openAndWait()` — Go-style `[error, result]` tuple (`AwaitedClose<TData>`); the `[Error, null]`
  branch is produced by `store.abandon()`
- No `as` casts — `Extract<Source, Target>` to narrow, `satisfies` to prevent widening

## Generated docs

`yarn docs:check` runs typedoc with `treatWarningsAsErrors` and is part of `yarn check`, so a broken
`{@link}` or a public signature naming an unexported type fails the gate. The validation choices and
the `intentionallyNotExported` list are in [typedoc.json](../typedoc.json) with their reasons; two
are worth knowing before editing anything:

- `notExported` and `invalidLink` are **on**. A type a public signature mentions but the entry point
  does not export is a real gap — it is how `ActionOptions` was found. Adding to
  `intentionallyNotExported` is a decision, so check first whether the type should just be exported.
- `notDocumented` is **off** because it flags exactly 67 things, all `Key` constants whose names are
  their documentation. Run `yarn docs:check --validation.notDocumented` before assuming that holds.

**The playground's `/api` reference covers all four entry points**, and its projection keys every
declaration by `specifier#name` — a bare name is not an identity when three bindings export
`useModal`. Two consequences live with the model in
[playground/vite-plugins/api-model.ts](../playground/vite-plugins/api-model.ts): a type the bindings
_share_ is one reflection, materialised under the first entry that names it; and a cross-reference
resolves against the **category table** rather than against where it was materialised. A root export
missing from `CATEGORIES` makes `/api` answer 500 and is caught by
[playground/src/\_\_tests\_\_/api-categories.test.ts](../playground/src/__tests__/api-categories.test.ts).

**`yarn docs:examples` holds the `@example` blocks to the same gates as the code** — prettier, `tsc`,
oxlint — by extracting each to a real module under `scripts/examples/generated/`. Two things about it
are not obvious and both are written in [the script](../scripts/check-examples.mjs): that directory is
deliberately **not** gitignored, because oxlint honours `.gitignore` with no override and an ignored
path is one it reports zero files for and passes; and the type pass runs twice, so free identifiers
(`store`, `fetchUser`, `api`) become `declare`d `any` and what remains is the example using _this_
library wrongly. The snippet allowances are in
[their own tsconfig](../scripts/examples/tsconfig.json) and the lint scope in `.oxlintrc.json`.

## React Compiler

`babel-plugin-react-compiler`, target `'19'`, **scoped to `src/react/`**. Four rules to write by:

- **No `useMemo` / `useCallback` / `React.memo`** — the compiler handles memoisation.
- **No ref writes during render** — use `useEffect`. Store objects with DOM methods taint as
  ref-like, so reach for the `GetDialog` getter pattern.
- **No property assignment on `useState` values** — `st.x = value` is forbidden everywhere. Use
  closure mutations or `Map.set()` (method calls are exempt).
- `open()`, `openAndWait()` and `handle` close over the store alone, so they are built once in
  `useModal`'s `useState` initialiser and are reference-stable — the compiler treats the store as
  opaque and cannot memoise them, and hoisting is what makes them usable as effect deps.

**The wiring is by hand in three places, and the obvious form does nothing** — `react({ babel: … })`
is accepted under this Vite and transforms nothing. The reasoning, the `src/react/` scoping (unscoped,
it writes `react/compiler-runtime` into the Solid binding) and the externals predicate are documented
where they are configured: [vite.config.esm.ts](../vite.config.esm.ts) and
[scripts/vite-plugin-react-compiler.mjs](../scripts/vite-plugin-react-compiler.mjs). **One grep tells
you which state you are in**: a compiled `use-modal.js` opens with `c(…)` and imports
`react/compiler-runtime`. Nothing asserts it — that is a named gap in the compatibility matrix.

Two consequences worth knowing before turning it off again. `runDeclarationWindow` exists because the
compiler cannot lower a `try` with no `catch`, and bails per function — the four lines wrapping
`render()` left the whole of `useModal` uncompiled. And it found a real staleness bug in `useLookup`,
where a read of mutable state was memoised on inputs that do not change when a modal registers;
expect more of that shape wherever code was written while it was silently off.

## Code Organization

1. Side effects → an `attach*` function in `core/` (framework-free, returns its teardown), plus a step in `MODAL_LIFECYCLE_STEPS` saying where in the sequence it runs and what it reads. Adding it to a binding instead is the mistake the director exists to prevent, and `wiring-order.test.ts` fails on it. A new one goes in the core even if only one binding needs it today — the second binding is the reason the first is written that way
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
