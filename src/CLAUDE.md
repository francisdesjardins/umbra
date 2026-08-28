# Library Source — Architecture & Patterns

## Entry points

- **[index.ts](index.ts)** — the package root: the framework-agnostic dialog manager, the
  store engine, the placement and style tables, `Key`. **Must resolve with no framework
  installed**, enforced by [\_\_tests\_\_/entry-isolation.test.ts](__tests__/entry-isolation.test.ts).
- **[react.ts](react.ts)** — the React binding: hooks, `DialogOutlet`, the provider. Re-exports
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

A type also belongs at the root if the root's own public surface **refers** to it: `DialogInfo`
is a root export, so `DialogPhase` must be too, or a root consumer cannot annotate what it was
handed. The hook-shaped types (`DialogHandle`, `DialogRenderArgs`, `DialogVariant`) are at the root
because they are framework-free; the two that are not — the option and return types — are the
core model instantiated per binding.

### The vocabulary

One act, one word. Each distinction below has exactly one spelling, and a synonym for any of them is
a bug report rather than a style preference. **The rule binds prose as much as identifiers** — the
last row was found by a reader noticing a comment used a word to mean something else.

| Concept                        | The word                      | Not                                          |
| ------------------------------ | ----------------------------- | -------------------------------------------- |
| `showModal()` vs `show()`      | **modal / non-modal**         | blocking / non-blocking                      |
| Which template built a dialog  | **`template`**                | kind, category, a second `type` field        |
| An unconditional transition    | **`beginOpen`**               | `requestOpen` (that one asks and may fail)   |
| Closed with nobody acting      | **`DISMISS_REASON`**          | a `'dismiss'` literal anywhere in `src/`     |
| The work an open waits on      | **`prepare` / `isPreparing`** | `onOpen` (that one reports; this is awaited) |
| A caller who may refuse        | **`on…Request`**              | a plain `on…` that reads a return value      |
| A flag covering every item     | **the name states the scope** | hanging it off the object that names one     |
| Which edge a panel slides from | **`direction`**               | anything else calling itself a direction     |

**A per-item flag is one word; an aggregate names its scope.** `action.isRunning(reason)` is one word
because the argument says whose it is; `hasRunningAction` says its own, and keeps that name on all
four layers that publish it. It does **not** move under `action`: the controller binding has no
factory to move it to, so one fact would end up with two names across the seam built to give it one.

**`direction` is the slide axis and nothing else.** `SlideDirection` is public and means one of four
edges, so the word is spent: Tab order is _forwards / backwards_, an assertion's positive and
negative cases are its **halves**.

**A callback's name says how it refuses**, and there are exactly three answers. **`on…Request` asks,
and the answer is the return value** — `onOpenRequest` through `request.refuse(reason)`,
`onDismissRequest` by returning `false`; the suffix marks a door, where `on…` alone reads as being
told after the fact. **A plain `on…` on a user gesture refuses through the event**: `onKeyDown` and
an action's `onClick` take the whole press with `preventDefault()` and return `void`, a boolean
being a second protocol for what the DOM already has. **`onClose` is a notification** and the only
one — its result is ignored, because the close has happened.

**`prepare` is awaited, not a gate.** A gate says no — `canDismiss`, `ActionGate`, `DismissGate` —
and `prepare` cannot: `syncOpenSequence` shows the dialog and schedules the phase's frame **before**
starting it, so the dialog reaches `'open'` either way and one that throws is logged and settles
like any other. What waits on it is `open()`'s promise, `isPreparing` and therefore `aria-busy`,
`dismissWhilePreparing`, and the labelling diagnostic.

**`dialog` is the noun, `modal` is the adjective.** The library drives one thing — a native
`<dialog>` — and drives it in two variants, so the element gets the name and the variant gets the
qualifier. `useDialog`, `DialogPhase`, `dialog-store.ts`, `dialogId` and `data-dialog-id` are the
noun; `nonModal`, `showModal()`, the CSS `:modal` pseudo-class and the phrase _a modal dialog_ are
the adjective and must stay that way. **There is no third word**: the state record and the element
are one concept here, and splitting them again is what this rule replaced.

The adjective is easy to sweep away by accident, so it is worth knowing where it hides: inside
`non-modal` (where a hyphen is the only boundary), inside `dialog:modal` (a platform selector, not
a namespace), and in front of `dialog` (`a modal dialog` is correct English; `a dialog dialog` is
how you find out a pattern went too far).

Two near-misses kept on purpose, so the next pass does not re-open them: `ActionGate`/`DismissGate`
are "gate" in two senses and the alternatives cost more than the ambiguity; `DialogRenderArgs` and
`BaseRenderContext` are one shape under two words because the alias is the seam
`SlideDialogRenderContext` intersects.

**`sync*` decides, `run*` does.** A `sync*` function is handed a phase and may decide there is
nothing to do, so it is safe on every pass; a `run*` function performs what it names, every time.

### Where a file goes

The folder names are the architecture's documentation, so a React hook in `core/` is a contradiction
rather than an inconvenience:

| Folder                                                            | Holds                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `core/`, `manager/`, `store/`, `actions/`, `utils/`, `templates/` | Framework-free. Must survive `entry-isolation.test.ts` walking the root.                                                        |
| `react/`, `solid/`                                                | Everything that imports its framework as a value — hooks, components, providers, and the option/return type instantiation.      |
| `vanilla/`                                                        | The controller binding. Framework-free like the core, but a _binding_ rather than a primitive: it composes, it does not decide. |

`react/` and `solid/` mirror each other **file for file**, with one documented exception,
`solid/from-store.ts` (React reads a store through `useSyncExternalStore` and needs no bridge). That
mirror is not a convention to be remembered:
[\_\_tests\_\_/binding-parity.test.ts](__tests__/binding-parity.test.ts) diffs the two entry points'
export names _and_ their module paths, so a hook added to one and forgotten on the other fails, and
so does putting it at a different depth.

**The paths matter as much as the names**, because a surface can be complete while the folders lie: a
`solid/` folder with no `use-slide-dialog` reads as "Solid does not have one", whatever a combined
`templates.ts` exports. A `templates/` folder on each side says the other true thing — the template
hooks are built _on_ `useDialog`, not peers of it, and their framework-free half lives in
`src/templates/`. For the same reason React's effects are **not** split into per-concern hook files:
a `react/hooks/` folder holding `use-click-outside.ts` reads as a feature list Solid is missing.
Both hook bindings run the whole lifecycle through **one** deps-free call into
[core/dialog-director.ts](core/dialog-director.ts), so the order is not theirs to write and the diff
between them is scheduling.

**A test lives next to what it tests, whatever framework its harness uses.** `apply-style.ct.tsx`
tests a core function through a React harness and belongs in `core/__tests__/`. Only a binding's own
surface belongs in `react/__tests__/`; shared harness helpers live in `src/__tests__/`.

### What is shared

[core/dialog-runtime.ts](core/dialog-runtime.ts) holds the parts that were written twice and were
identical both times: `resolveDialogOptions` (the defaults _and_ the variant narrowing — reading
`dismissOnBackdropClick` without checking `nonModal` first is a type error here and a
silently-ignored option in a binding that got it wrong), `createDialogRuntime` (store, engine,
`open`, `openAndWait`, `handle`), `shouldDismissOnBackdropClick`, and `teardownDialog`. `animation`
is deliberately _not_ resolved there: its fallback is a concrete literal that a function generic
over the binding's style type could not return, so each binding keeps the one annotated line.

### What a binding actually does

The short list, and the measure of whether the core is doing its job. A binding:

1. builds a `<dialog>` element and puts the shared attributes on it (`core/dialog-props.ts`),
2. subscribes to `createDialogStore` and `createActionEngine` the way its framework subscribes,
3. calls `director.sync(pass)` from whatever it calls an effect and `director.destroy()` from
   whatever it calls a cleanup — the `attach*` functions and their order are the director's,
4. writes the computed style (`getDialogAnimationStyles`) onto the element,
5. calls `render` inside `engine.beginRender()` / `engine.endRender()`,
6. registers with the manager and unregisters on teardown.

Everything else — the state machine, the DOM lifecycle, the dismissal rules, focus, hotkeys,
placement, slide geometry, the action factory, the default animation — is shared.

**That list is one file per binding, and that file is the measure**: `react/use-dialog.tsx` and
`solid/use-dialog.ts` are a little over 200 code lines each, `vanilla/bind-dialog.ts` about 260, none
of it logic. Say which file — the folder is not the same number, the outlet, the provider,
`useLookup` and the templates roughly doubling it as surface rather than lifecycle.

A **controller** binding does 1, 3 and 6 the same way, replaces 4 with `applyStyle` on the caller's
element, and drops 2 and 5: there is no render pass, so actions are declared by `bindAction` and
retired by the unbind it returns rather than by a declaration window. Its driver is the store
itself, there being no other clock — safe here precisely because there is no commit timing to race.

### The two open knobs

`core/types.ts` is generic over exactly two things, because exactly two things differ between
frameworks: the type of a **style object** and the type of a **rendered node**. Each binding pins
them in one small file — [react/types.ts](react/types.ts) says `CSSProperties` and `ReactNode`,
[solid/types.ts](solid/types.ts) says `DialogStyle` and `JSX.Element` — and re-exports the four
resulting types (`DialogAnimation`, `UseDialogBaseOptions`, `UseDialogOptions`, `UseDialogReturn`)
under their ordinary names. A consumer never sees a type parameter.

`DialogStyle` ([core/style.ts](core/style.ts)) is the framework-free default: a mapped type over the
`string`-valued keys of `CSSStyleDeclaration`, so the property list grows with the platform rather
than with an edit. React's `CSSProperties` is assignable to it, which lets
`getDialogAnimationStyles<TStyle extends DialogStyle>` return `DialogStyle & Partial<TStyle>` — an
intersection React's `style` prop accepts with no assertion. `applyStyle` is the other half: the one
way to write a style object onto an element, clearing what the previous one set, for a binding that
owns its DOM node instead of describing it.

## Import specifiers carry `.js`

**Every relative import in `src/` ends in `.js`** (`'./types.js'`, `'../store/index.js'`) even
though the file on disk is `.ts`/`.tsx`. `tsc` copies relative specifiers into the emitted `.d.ts`
verbatim, and an extensionless one — or a bare directory — is invalid under
`moduleResolution: node16`/`nodenext`, in the worst way: `skipLibCheck: true` (a common default)
suppresses the resolution error, so the imported types degrade to an error type the checker waves
through and the package appears to type-check while providing no safety at all.

Vite resolves `./x.js` to `x.ts`/`x.tsx`, so nothing else changes, and
`scripts/verify-package.mjs` fails the build on any that slip into the built declarations.

## Architecture

Three layers: framework-agnostic core, the bindings over it, headless template hooks. Layer 1 is
shared; layers 2 and 3 exist once per binding and are thin.

### Layer 1: Core Primitive

Which file to open, and nothing else. **Every one carries its reasoning in its own doc comment**, so
restating any of it here is how the two drift.

| Concern                | File                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDialog`            | [react/use-dialog.tsx](react/use-dialog.tsx), [solid/use-dialog.ts](solid/use-dialog.ts)                                                                                                 |
| The state machine      | [core/dialog-store.ts](core/dialog-store.ts) — one method per transition                                                                                                                 |
| The lifecycle sequence | [core/dialog-director.ts](core/dialog-director.ts) — who asks the `attach*` functions, in what order                                                                                     |
| The manager            | [manager/dialog-manager.ts](manager/dialog-manager.ts) — registry, the doors, the asking door                                                                                            |
| The stack order        | [manager/stack-order.ts](manager/stack-order.ts) + `raiseDialog` in [core/dialog-lifecycle.ts](core/dialog-lifecycle.ts)                                                                 |
| Body scroll lock       | [manager/scroll-lock.ts](manager/scroll-lock.ts), modal only, over [manager/lock-ledger.ts](manager/lock-ledger.ts) — claim-per-owner, which is what makes two managers on one page safe |
| Provider / reactive    | `{react,solid}/dialog-manager-context`, `{react,solid}/use-dialog-manager`                                                                                                               |
| Types                  | [core/types.ts](core/types.ts), [manager/types.ts](manager/types.ts), [actions/types.ts](actions/types.ts)                                                                               |

Two rules that belong to no single file: **use the `dialogManager` a hook returned, not the static
singleton**, for cross-dialog calls, since only the first is context-aware; and the `<dialog>` is
`display: flex; flex-direction: column`, with **sizing user-land** through `style`.

**The DOM wiring is `attach*` functions, not hooks** — `(ctx: DialogDomContext, options)`, returning a
teardown (or `undefined` when nothing was attached). **Who calls them, in what order, and on which
pass is [core/dialog-director.ts](core/dialog-director.ts)'s**, whose JSDoc holds that reasoning,
including why each step declares its own inputs rather than sharing one key:

- `syncOpenSequence` / `syncCloseSequence` ([core/attach-lifecycle.ts](core/attach-lifecycle.ts))
- `attachDialogKeydown` / `attachDialogCancel` / `attachWindowDismissKey`
  ([core/attach-keydown.ts](core/attach-keydown.ts)) — three listeners with three lifetimes
- `attachClickOutside` ([core/attach-click-outside.ts](core/attach-click-outside.ts))
- `attachFocusContainment` ([core/attach-focus-containment.ts](core/attach-focus-containment.ts)) —
  opt-in through `containFocus`, and **not non-modal-only**: the same attachment recovers a Tab that
  WebKit swallows on any dialog
- `createFocusCoordinator` ([core/attach-focus.ts](core/attach-focus.ts)) — a coordinator, because
  where the opening focus landed outlives one attachment. Owned by the director; no binding builds
  one
- `createActionFactory` ([core/action-factory.ts](core/action-factory.ts))
- `dialogAttributes` / `setDialogAttributes` / `isBackdropClick` / `DIALOG_CONTENT_STYLE`
  ([core/dialog-props.ts](core/dialog-props.ts))
- `dialogPlacement` ([core/placement.ts](core/placement.ts)) — the positioning contract as data, and
  public from the root, so a hand-written host places a dialog identically
- `canDismiss` / `answerDismiss` ([utils/dismiss-gate.ts](utils/dismiss-gate.ts)) — the predicate
  every dismissal path shares, and their last step
- `resolveAnimation` ([utils/animation-utils.ts](utils/animation-utils.ts)) — read by both the inline
  `transition` and the `transitionend` wait, so the two cannot disagree

### The styling surface

Everything a consumer needs to style a dialog, and nothing that requires knowing how the tree is
built:

- **`--dialog-backdrop`** — the library's one visual opinion, read by its single `dialog::backdrop`
  rule, default `rgba(0, 0, 0, 0.7)`. Inherited, so setting it anywhere is a declaration rather than
  a specificity fight. **The sheet is adopted per _root_, not per document** — see
  [core/dialog-styles.ts](core/dialog-styles.ts).
- **`data-dialog-id`** and **`data-dialog-type`** on the `<dialog>` — how CSS reaches one dialog or
  every non-modal one. `data-testid` is for tests and is **not** a styling contract.
- **`style`** — the size of the `<dialog>` box, which the library never decides. The same lever the
  template hooks pull; a template's structural styles merge _under_ a caller's.
- **`data-loading`** on an action's button props — the running state, and the only form the library
  ships it in. A core agnostic of the UI cannot name the busy flag for one component library (MUI
  says `loading`, another `busy`), so the caller maps it — one destructure at the
  call site, which is what `playground/src/pages/ui-integrations/examples/mui-form.tsx` shows, and
  the reason that example is written against MUI rather than through a wrapper.

**Three platform traps live on the `style` option's doc in [core/types.ts](core/types.ts)**, where a
caller meets them: each reaches the consumer's own box rather than the library's, and a **non-modal**
dialog gets none of the three — so `nonModal: true` silently changes what a caller's sizing means.

A **closed** dialog is `display: none`. The UA says so, but the library's inline `display: flex`
outranks it — and a contained dialog is `inset: 0`, so without this it stays an invisible
full-region click blocker. `getDialogAnimationStyles` takes the phase for that.

### Naming a dialog

`ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` and `role: 'dialog' | 'alertdialog'` reach the
`<dialog>`. A dialog with no accessible name is announced as just "dialog", and the library cannot
invent one — so it takes the caller's and **omits the attribute entirely when absent**, because
`aria-label=""` would hide the omission from an audit.

`role` is deliberately not the whole ARIA surface: a `<dialog>` _is_ a dialog, and a surface that is
not one — a toast, a popover — wants a live region **inside** it rather than a role contradicting its
element. **It narrows with the variant**: `'alertdialog'` is the modal branch's alone, an alertdialog
being dialog by definition — the pair is a type error on the hook bindings, and on `umbra/vanilla`'s
hand-written markup the labelling diagnostic reports it. **`role: 'alertdialog'` does not require
`ariaDescribedBy`**; that was considered and rejected, on the rule in
[core/dialog-labelling.ts](core/dialog-labelling.ts).

**The diagnostic that _is_ shipped** is `syncLabellingDiagnostics`
([core/attach-lifecycle.ts](core/attach-lifecycle.ts)) over that rule, and — like every warning here
— it is **silent until `setLogLevel`**. What it reports, and the three timing rules that make the
answer mean anything, are next to the code.

**`aria-busy` is the one attribute the library owns rather than relays**, and the only one that
toggles — so it is always written, `'false'` included, and `isPreparing` is **required** on
`DialogAttributeOptions`. `setDialogAttributes` skips `undefined` rather than removing, and
`bindAction`'s unbind restores what it found: contracts about markup the caller owns, not
optimisations. See [core/dialog-props.ts](core/dialog-props.ts).

### Layer 2: Template Hooks

Each wraps `useDialog` with a template-specific render context. Shared internals in [templates/shared.ts](templates/shared.ts), and the slide panel's transforms and positioning in [templates/slide-geometry.ts](templates/slide-geometry.ts) — framework-free, read by both bindings' `useSlideDialog`. Solid's two templates are in [solid/templates/](solid/templates/), the same three lines each.

`buildDialogOptions` needs its type arguments spelled out at every call site: `TemplateBaseOptions` is an `Omit`, and TypeScript cannot infer through a mapped type, so left alone the style and node parameters fall back to their framework-free defaults and the result stops being that binding's options.

- `useMessageDialog<TData>` ([react/templates/use-message-dialog.tsx](react/templates/use-message-dialog.tsx)) — `DialogRenderArgs` unchanged; reports `template: 'message'`
- `useSlideDialog` ([react/templates/use-slide-dialog.tsx](react/templates/use-slide-dialog.tsx)) — direction-based animation, reports `template: 'slide'`, context `DialogRenderArgs & { direction }`. `align?: 'stretch' | 'start' | 'center' | 'end'` (default `stretch`) places the panel on the **cross axis**: `stretch` fills it edge-to-edge, the others pin a content-sized panel. `center` folds its `-50%` self-shift into both keyframes — `transform` is one property and the slide owns it, so a separately-set cross-axis translate would be overwritten.

### Dialog Actions

Actions are **declared by being rendered**. `render` is handed an `action` factory; calling it names
the reason, binds the handler and returns the props to spread. There is no config object, no second
hook, and nothing to pass into `useDialog`.

- **The reason is the action's identity** — it names the action _and_ is the close reason.
  `action('confirm')` closes with `reason: 'confirm'`; the handler is optional, omitting it
  auto-closing with that reason.
- **Declare the reasons and the payload** — `useDialog<Result, 'save' | 'cancel'>`, or once in
  `DialogRegistry`. The `TReason = string` default accepts anything, costing the three things the
  design exists for: a mistyped `action('savee')` rejected, autocomplete, an exhaustive `switch`.
- **`'dismiss'` is reserved, and the reservation is a type** —
  `ActionReason<TReason> = Exclude<TReason, DismissReason>`, so no action may be _named_ it, while
  `handle.close('dismiss')` stays legal because reporting a dismissal is not declaring an action.
  What the type cannot deliver, and the warning covering it, are in
  [core/dismiss-reason.ts](core/dismiss-reason.ts).
- **The engine** ([actions/action-engine.ts](actions/action-engine.ts)) holds execution and state,
  framework-free, built alongside the store and bound straight to `close` — nothing handed in,
  nothing bridged. The `attach*` functions see it as the payload-free `ActionGate`.
- **The factory** ([core/action-factory.ts](core/action-factory.ts)) builds `action`, and **its
  three live fields are getters** (`disabled`, `data-loading`, `aria-busy`) — which lets one factory
  serve a virtual-DOM renderer and a fine-grained one. `./vanilla` has no factory, so the controller
  carries the noun as `isActionRunning(reason)`.
- **The declaration window** is `beginRender()` / `endRender()` around `render`: re-declaring per
  pass rather than accumulating stops a hotkey outliving its button. **`undeclare` is the
  fine-grained half** — Solid never re-runs the parent, so a button removed by its own `<Show>`
  retires its own declaration, and `hasActions()` decides whether a backdrop click dismisses.

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
`<button>`, or its hotkeys silently fail. Same for `data-focus-on-open` and `data-action-reason`.

**The attribute is not the label.** `formatAriaKeyshortcuts` produces the `KeyboardEvent.key` form
that reaches the DOM, and both the dispatch selector and `engine.ownsHotkey` are built from it;
`formatHotkeyLabel` produces the human form (`Ctrl+Enter`) and is for reading only. They agree by
construction, and how is in [utils/hotkey-utils.ts](utils/hotkey-utils.ts).

**Scoped to the declaring dialog** ([utils/dialog-scope.ts](utils/dialog-scope.ts)). A dialog opened
from inside another renders its `<dialog>` in that subtree, so its events bubble through every dialog
underneath: `isOwnEventTarget` drops those at the keydown listener and `queryOwn` keeps dispatch off
a nested dialog's buttons. Without them one Escape unwinds the whole stack.

### Opening focus

`action(reason, { focusOnOpen: true })` emits `data-focus-on-open`, and the coordinator focuses that
button once the phase reaches `'open'`. **It is not React's `autoFocus`**: React does not put the
native `autofocus` attribute in the DOM (probed, not assumed) and `showModal()`'s focusing steps read
exactly that attribute, so the library applies the focus itself.

The restore target after an action is _not_ that button by default — `chooseActionRunner`
([utils/focus-restore-policy.ts](utils/focus-restore-policy.ts) decides; the DOM functions acting on
those decisions are [core/focus-policy.ts](core/focus-policy.ts)) narrows through three reads to find
who actually ran it, falling back to the claimed one. Why three, and which engine needs each, is on
that function and on the coordinator in [core/attach-focus.ts](core/attach-focus.ts).

**Closing focus is a floor, not a policy**, and knowing that is what makes `restoreFocusTo` legible.
The platform restores the element focused before the open — for `show()` as well as `showModal()`,
but only when focus is still inside at `close()` time — and `restoreOpenerFocus`
([core/dialog-lifecycle.ts](core/dialog-lifecycle.ts)) covers the case where it did not. So the
option is consulted **only where the restore already owns the focus**, which
`restoreOwnsTheFocus` decides: stranded, or landed back on the captured opener. Anywhere else is a
caret the reader placed, and taking it would be theft rather than repair. That guard is the whole
reason this is not `onClose` plus a `focus()` — user-land can express the move but not the
condition, since the opener is a `WeakMap` nobody outside can read.

### Never hold an element across something that replaces it

**The defect this codebase keeps producing** — three times in a day, one shape: a reference captured
once, and a renderer, a fragment swap or a `disabled` toggle replacing the node under it. Nothing
errors; the held node stops being the one on screen and whatever depended on it goes quiet. The
failed-action restore held its button, which Solid replaces; `bindDialog` holds its `<dialog>`,
which an htmx swap removes; the coordinator bound `focusin` to the dialog element, and a renderer
replacing it emptied the bookkeeping for that dialog's life — that step's input is the phase, which
does not change when the node does.

In order: **find it again rather than remember it**, through an identity outliving the node and
re-queried at use — why action props carry `data-action-reason`. Failing that, **bind to the root,
not the element**, resolving `getDialog()` per event; those events bubble, so the scoping predicate
still works. Failing both, **say so**: a control the caller replaces has no stable identity to
re-find, and that limit belongs in the matrix.

## Type System

**The model derives; it does not restate.** Adding a field means finding the one type that owns
the concept, not editing three that describe it. The chain, rooted in [core/types.ts](core/types.ts):

```
DialogRenderArgs<TData>                ← the render-time slice:
│                                       { isPreparing, phase, handle, action, hasRunningAction, error }
├── UseDialogReturn<TData>   = DialogRenderArgs<TData> & { open, openAndWait, isVisible, Dialog,
│                                                        dialogManager }
└── BaseRenderContext<TData>= DialogRenderArgs<TData>               (templates/shared.ts)
    ├── MessageDialogRenderContext<TData> = BaseRenderContext<TData>
    └── SlideDialogRenderContext<TData>   = BaseRenderContext<TData> & { direction }

UseDialogBaseOptions<TData, …, TStyle, TNode>   ← flat, variant-free option surface
├── UseDialogOptions<…>      = UseDialogBaseOptions<…> & DialogVariant
│   ├── react/types.ts      = …<CSSProperties, ReactNode>     ← exported as `UseDialogOptions`
│   └── solid/types.ts      = …<DialogStyle, JSX.Element>     ← exported as `UseDialogOptions`
└── TemplateCommonOptions<…> = Omit<UseDialogBaseOptions<…>, the 5 a template owns>
    │                          & DialogVariant
    └── TemplateBaseOptions<TData, TRenderContext, …>
```

The two trailing parameters are the whole of what a binding contributes, and they carry defaults
(`DialogStyle`, `unknown`) so the core's own code never spells them. A consumer never sees them
either: each binding re-exports the instantiation under the plain name.

`TemplateCommonOptions` is stated as a **complement** on purpose: an option added to
`UseDialogBaseOptions` reaches every template hook by default, and only a deliberate edit to the
exclusion list keeps it out. Spelled the other way round — the enumeration of forwarded keys it
replaced — a new core option reached no template and nothing failed.

So a new render-time field is added to `DialogRenderArgs` **once** and reaches the hook return and
every template context, with a caveat like `isPreparing`'s (it tracks the `prepare` callback, not
the `'opening'` phase) written in one home rather than three.

**One input comes from outside the model.** `core/registry.ts` declares `DialogRegistry` for a
consumer to augment; `DialogId`, `ReasonOf` and `DataOf` read off it, and every hook —
`useDialog`, both templates, `bindDialog` — leads with an overload constrained to
`RegisteredDialogId`, so a declared id supplies `TData` and `TReason`. `DialogId` stays open, since a
project hosts dialogs it does not own. The augmented half is `yarn type-check:registry` over
`type-fixtures/`, compiled alone because declaration merging is global.

### The payload flows

`TData` is threaded through every hop of the close path, so the payload a dialog declares is the only
one any of its doors accepts:

```
useDialog<TData, TReason>
├── DialogHandle<TData, TReason>.close(reason?: TReason | 'dismiss', data?: TData)
├── ActionFactory<TData, TReason>      ← the `action` in the render args
├── createDialogStore<TData, TReason>   → DialogStoreSnapshot.closeResult: CloseResult<TData, TReason>
└── onClose(result: CloseResult<TData, TReason>)  ·  openAndWait(): [Error, null] | [null, CloseResult]
```

**Three choices make that work with no assertion anywhere, and each is a trap if reversed** —
`CloseResult` is a plain object rather than a conditional, the store _runs_ `onClose` rather than
returning it, and the hooks take `ActionGate` rather than `ActionEngine<TData>`. Each reason is on
the declaration it constrains, being a fact about that type and nothing else — as are the two
deliberate non-derivations, `RegisteredStore` and `DialogVariant`.

**A declared id's correlated close lives in the overload declarations and nowhere else**
(`core/registered-types.ts`): `CloseOf` is a union keyed by `reason`, which is opaque at a generic
boundary the way a conditional is, so the internals stay on the flat model and no `as` bridges
them. `DataOf` ends in `infer` for the same law read the other way — un-augmented it stays
deferred, the checker compares against the union of its branches, and narrowing that union is what
stops the manager's facade from implementing its own signature.

Pinned by [core/\_\_tests\_\_/type-model.test.ts](core/__tests__/type-model.test.ts) — compile-time
assertions plus `@ts-expect-error` checks that the variant's mutual exclusion and the payload
rejection are real, so flattening a derived type into an equivalent-looking literal fails there.
`verify:package` re-checks the same guarantees against the published `.d.ts`.

- `openAndWait()` — Go-style `[error, result]` tuple (`AwaitedClose<TData>`). Three things take the
  `[Error, null]` branch: `store.abandon()`, an id nobody registered, and — since a resolver
  registered mid-exit would otherwise be handed a close it did not cause — a dialog already
  `'closing'`. The rule is `addCloseResolver`'s, so every awaiting door inherits it.
- No `as` casts — `Extract<Source, Target>` to narrow, `satisfies` to prevent widening

## Generated docs

`yarn docs:check` runs typedoc with `treatWarningsAsErrors`, so a broken `{@link}` or a public
signature naming an unexported type fails `yarn check`. **`notExported` is on**, and a type a public
signature mentions but the entry point does not export is a real gap — it is how `ActionOptions` was
found, so adding to `intentionallyNotExported` is a decision rather than a fix. Every validation
choice is in [typedoc.json](../typedoc.json) with its reason.

**`yarn docs:examples` holds the `@example` blocks to the same gates as the code** — prettier,
`tsc`, oxlint — by extracting each to a real module under `scripts/examples/generated/`;
[the script](../scripts/check-examples.mjs) carries the two non-obvious parts.

**A new root export needs a `CATEGORIES` entry** in
[api-model.ts](../playground/vite-plugins/api-model.ts) or the playground's `/api` answers 500 —
caught by [api-categories.test.ts](../playground/src/__tests__/api-categories.test.ts), not by
`yarn check`. How that reference is projected is
[playground/CLAUDE.md](../playground/CLAUDE.md#the-api-reference-is-generated)'s subject.

## React Compiler

`babel-plugin-react-compiler`, target `'19'`, **scoped to `src/react/`**. Four rules to write by:

- **No `useMemo` / `useCallback` / `React.memo`** — the compiler handles memoisation.
- **No ref writes during render** — use `useEffect`. Store objects with DOM methods taint as
  ref-like, so reach for the `GetDialog` getter pattern.
- **No property assignment on `useState` values** — `st.x = value` is forbidden everywhere. Use
  closure mutations or `Map.set()` (method calls are exempt).
- `open()`, `openAndWait()` and `handle` close over the store alone, so they are built once in
  `useDialog`'s `useState` initialiser and are reference-stable — the compiler treats the store as
  opaque and cannot memoise them, and hoisting is what makes them usable as effect deps.

**The wiring is by hand and the obvious form does nothing** — `react({ babel: … })` is accepted under
this Vite and transforms nothing. That, the `src/react/` scoping and the externals predicate are
documented where they are configured: [vite.config.esm.ts](../vite.config.esm.ts) and
[scripts/vite-plugin-react-compiler.mjs](../scripts/vite-plugin-react-compiler.mjs).

**One grep tells you which state you are in**: a compiled `use-dialog.js` opens with `c(…)` and
imports `react/compiler-runtime`. `verify:package` asserts that against the built artifact, and
asserts the Solid binding is _not_ compiled — the half that catches a lost scope.

It bails **per function** on constructs it cannot lower, silently. `runDeclarationWindow` exists
for one of them: four lines of `try` with no `catch` around `render()` left the whole of `useDialog`
uncompiled.

## Code Organization

1. Side effects → an `attach*` function in `core/` (framework-free, returns its teardown), plus a step in `DIALOG_LIFECYCLE_STEPS` saying where it runs and what it reads. Adding it to a binding instead is the mistake the director exists to prevent, and `wiring-order.test.ts` fails on it — a new one goes in the core even if only one binding needs it today
2. Pure functions → `utils/`
3. Compiler ref complaints → inline the handler
4. State → the `store/` module ([store/CLAUDE.md](store/CLAUDE.md)) — hand-rolled reactive cell, zero runtime deps
5. Types → `core/types.ts` (the framework-free model, generic over style and node), `react/types.ts` and `solid/types.ts` (the two instantiations), `core/style.ts` (`DialogStyle`), `manager/types.ts` (lookup), `actions/types.ts` (dialog actions)
6. Template shared → `templates/shared.ts`
7. Error handling → `normalizeError` (`utils/normalize-error.ts`) is the one general-purpose helper the root exports: it produces the `Error` an action reports, and a caller composing its own handler wants the same normalisation. Async **coordination** — a mutex, single-flight, a fetch-state machine — is user-land in `playground/src/shared/lib/`, copied like the dialog templates. `fireAndForget` (`utils/fire-and-forget.ts`) is **internal**, for the lifecycle's own detached callbacks
8. Framework-free store observation → `store.subscribe(listener)` and read `getSnapshot()`; that pair is the whole contract. React consumes it through `useSyncExternalStore` with no adapter; Solid's is `fromStore` (`solid/from-store.ts`), six lines, and public because every Solid consumer would otherwise write it

### State (store module)

State management lives in [store/](store/) — a hand-rolled reactive cell (a `Set` of listeners + `get`/`set`) with **zero runtime dependencies**, and the single swap point for the engine: reimplement those files to change it. Import the primitives from `../store` internally, or from the package root in the playground. Its two modes, mutation and derived state are [store/CLAUDE.md](store/CLAUDE.md)'s subject and are not restated here.

**The barrel is safe for every core module to import**, with no exception to remember: `src/store/` is the engine and nothing over it, so it imports no React at all. That is what the root's React-freedom rests on — not on tree-shaking a re-export back out.

## Debug Logging

`createLogger(namespace)` ([utils/logger.ts](utils/logger.ts)). Enable: `localStorage.setItem('dialog:log', '*')`. Namespaces: `manager`, `outlet`, `dialog`, `dialog:lifecycle`, `dialog:keydown`, `dialog:click-outside`, `action`.

## Testing Details

Tests are auto-wrapped in `<DialogManagerProvider>` via [playwright/index.tsx](../playwright/index.tsx), so each gets isolated state. That wrapper is **React's**: a Solid harness wraps itself in Solid's, or its dialogs register with the module-level singleton and leak between tests.

**Solid harnesses** ([solid/\_\_tests\_\_/](solid/__tests__/)) are a Solid root hosted inside a React CT story: the story renders a `<div>`, calls Solid's `render` into it from an effect, and returns the disposer as the cleanup. They are written with `h` rather than JSX, so no Solid compiler enters the CT bundle — and nothing is lost, because hyperscript detects the getters an action's props carry and spreads them reactively, exactly as compiled JSX would.

**Cross-dialog in stories** — use `dialogManager` from `useDialog` return, not the static singleton:

```tsx
const { Dialog, dialogManager } = useDialog({ id: 'my-dialog', ... });
dialogManager.open('other-dialog'); // ✅ context-aware
```

**Harness rules**: declare at module scope, not inside `test()`; follow React Compiler constraints.

**Stories page registration**: Export from barrel → add `StoryEntry` in `StoriesPage.tsx` → register `?raw` import in `codeSamples.ts`. A story off the page is invisible: it builds, runs in CT, and nobody reaches it — **gated** by `stories-registration.test.ts`, whose exemption list is empty, so an omission is a written decision. A harness sharing a file is cut out of it by name (`sliceDeclaration`). The exception is a **parameterised** harness: `StoryEntry.component` takes no props, so one requiring them is a fixture rather than a demo and the gate skips it — give it a prop-free default if it is worth showing.

**Selectors**: `<dialog data-testid="dialog-{id}">`; prefer `getByTestId`/`getByRole` to CSS, with `{ exact: true }` for partial label matches.

Public API: [index.ts](index.ts).
