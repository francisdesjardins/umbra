# CLAUDE.md

Framework-agnostic dialog/modal manager, with React, Solid and vanilla shipped as three bindings
over it. No UI components exported; users bring their own.

## Entry points

The package root is plain TypeScript and **must resolve with no framework installed**. Bindings
are the optional layer.

| Specifier       | Contents                                                                                                                                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `umbra`         | `dialogManager`, `createDialogManager`, `dialogPlacement`, `applyStyle`, the store engine (`createStore`, `StoreContract`), `normalizeError`, `Key`, `HotkeyDef`, `matchesHotkey`, `formatHotkeyLabel`, `formatAriaKeyshortcuts`, `setLogLevel`. No framework. |
| `umbra/react`   | `useModal`, `useMessageModal`, `useSlideModal`, `ModalOutlet`, `DialogManagerProvider`, `useDialogManager`, `useLookup` — **plus a wholesale re-export of the root**, so a React app imports from this path only.                                              |
| `umbra/solid`   | The same names, for Solid, plus `fromStore` — and the same wholesale re-export of the root.                                                                                                                                                                    |
| `umbra/vanilla` | `bindDialog` — a _controller_ for a `<dialog>` you wrote yourself, whose `bindAction` is a member of the returned controller rather than an export. No `render`, no `Modal`, no outlet, no framework. Same wholesale re-export.                                |

**There are two kinds of binding, and the distinction is load-bearing.**

_Hook_ bindings — `./react` and `./solid` — **render**: a `render` callback returns the content and
the binding returns a `Modal` to place. They share a surface on purpose, down to the file names, so
a team running both writes the same modal twice with the same words. Three differences, and all
three are the renderer's: Solid's live values (`isVisible`, `isPreparing`, `hasRunningAction`,
`error`) are getters over signals rather than re-rendered values — so **do not destructure the
render args** — `useLookup` returns an accessor rather than an object (a discriminated union cannot
survive being spread into getters), and `portal: true` mounts the dialog itself, leaving `Modal` as
`null`.

The _controller_ binding — `./vanilla` — **does not render**, and could not without the library
shipping a renderer, which is the one thing it refuses to do. The `<dialog>` and its contents are
markup the caller already wrote; `bindDialog` drives the lifecycle over it. So it has no `render`,
no `Modal` and no outlet, and it gains `bindAction(button, reason)` — which attaches the handler
_and_ keeps `disabled` / `data-loading` / `aria-busy` in step, the half a renderer does elsewhere.
Asserting it mirrored the hook bindings would be asserting the wrong thing; `binding-parity.test.ts`
knows the difference and records what it must and must not have.

Adding a fourth binding (Vue, a web component) means adding a sibling of `src/react.ts` and a new
`exports` entry. Nothing under the root changes — see [src/CLAUDE.md](src/CLAUDE.md#what-a-binding-actually-does)
for the list of what it inherits.

**Entry-point isolation is a test, not a convention:**
[src/\_\_tests\_\_/entry-isolation.test.ts](src/__tests__/entry-isolation.test.ts) walks the real
import graph from each entry and asserts that the root reaches no framework, that each hook
binding reaches its own and only its own, and that `./vanilla` reaches none (type-only imports are erased, so those are fine). The
positive halves are what stop the root's assertion from passing because the walker resolved
nothing. `peerDependenciesMeta` marks `react`, `react-dom` and `solid-js` optional, which is the
promise those tests defend, and `verify:package` re-checks all of it against the built artifact.

## Commands

```bash
yarn install            # Install dependencies (Yarn 4 via Corepack)
yarn dev                # Dev server (debug: localStorage.setItem('dialog:log', '*'))
yarn build              # Build library (ESM bundle + .d.ts via tsc)
yarn build:types        # Declarations only (tsc -p tsconfig.build.json)
yarn type-check         # TypeScript checking
yarn lint:fix           # Lint and auto-fix
yarn format             # Format code
yarn docs:examples      # Format, type-check and lint every JSDoc @example (part of `yarn check`)
yarn docs:examples:fix  # Rewrite those examples through prettier, in place
yarn verify:all         # Full validation (lint + type-check + build + package checks)
```

## Testing

Playwright for unit + component tests (`playwright.config.ts`).

```bash
yarn test                   # All tests (unit + component)
yarn test:ui                # All with Playwright UI
yarn test:unit              # Unit tests only (*.test.ts)
yarn test:unit:coverage     # Unit tests with coverage (c8)
yarn test:unit:ui           # Unit tests with UI
yarn test:component         # Component tests only (*.ct.tsx)
yarn test:component:ui      # Component tests with UI
yarn test:component:coverage # Component tests with coverage (istanbul, see below)
```

| Suffix        | Purpose                                 |
| ------------- | --------------------------------------- |
| `*.test.ts`   | Unit tests — pure functions, no browser |
| `*.ct.tsx`    | Component tests — Playwright CT         |
| `*.story.tsx` | Harness components imported by CT tests |

### What coverage measures

`yarn test:unit:coverage` measures the **unit** project, which is Node with no DOM — so the
exclude list in `.c8rc.json` is not a way to make a number look better, it is the statement of
what that project can reach. Three groups, and the reason each is there:

- **Type-only modules** (`core/types.ts`, `actions/types.ts`, the two bindings' `types.ts`, …) —
  no runtime at all, so they report 0% forever and drag the number with them.
- **Every binding** (`src/react/**`, `src/solid/**`, `src/vanilla/**`) and the entry barrels —
  component-tested, and measured by the _other_ report rather than not at all: see
  [The component project measures itself](#the-component-project-measures-itself). A glob, because
  a new file there is component-test territory too.
- **The DOM-only modules** (`attach-*`, `dialog-lifecycle`, `focus-policy`, `dialog-styles`,
  `utils/dialog-scope`) — listed **one by one**, deliberately. A new module is not silently
  excluded: it shows up as a gap until someone decides which kind it is. The line is _zero_
  reachable runtime in Node — `dialog-styles` needs `CSSStyleSheet` and `adoptedStyleSheets`,
  `dialog-scope` needs `Element` and `closest`. A file with a testable half stays visible and
  partially covered (`manager/scroll-lock`, `core/style`), because excluding it would hide the
  half that is a real gap.

### The component project measures itself

`yarn test:component:coverage` is the other half, and it exists because the first list above is
only honest if what it excludes is measured somewhere. It is opt-in (`CT_COVERAGE=1`) because
instrumentation costs about 45% of the run, and it reports the bindings and the DOM-only core
modules that c8 cannot reach — currently 92.99% statements over 48 files, against the unit
project's 97.81% over the framework-free half.

**Coverage is a local command, not a CI job, and that is deliberate.** GitHub's code-coverage
upload (`actions/upload-code-coverage`, Cobertura only) was wired up and reverted the same day: it
returns **HTTP 404** here because Code Quality is gated on an enterprise owner allowing it, and
this is a personal repository — "Code quality" does not appear under Settings → Security at all.
Running the coverage variants in CI to publish an artifact nobody opens costs the component job
roughly 45% more runtime for a number nothing displays. Do not re-add it unless the repo moves
under an enterprise **and** something actually renders the result.

**Every way this has failed so far has failed quietly**, which is why the list is three items long
and why `ct-coverage-report.mjs` prints all three when it finds nothing. An empty `.nyc_output`
does not say which stage produced nothing, and reading it as "the flag was not set" is the
expensive mistake:

- **Instrumentation is `enforce: 'pre'`** ([scripts/vite-plugin-ct-coverage.mjs](scripts/vite-plugin-ct-coverage.mjs)),
  on the file as written. `vite-plugin-istanbul` is the obvious tool and it instruments _stripped_
  output, remapping through a source map that looks healthy and is not: every counter below a
  file's JSDoc block lands sixteen lines early, attributing statements to prose.
- **There are two CT build caches.** Playwright keys its bundle on versions and a hash of the
  sources, not on the plugin list, so a single cache makes toggling `CT_COVERAGE` a coin toss —
  and the failure is silent, an empty `.nyc_output` rather than an error. `use.ctCacheDir` splits
  them. Editing the instrumenter itself invalidates neither; delete `playwright/.cache-coverage/`
  by hand for that one.
- **The path filter is separator-normalised.** Vite hands module ids with forward slashes and
  `path.relative` answers in the platform's, so on Windows the filter compared `src\core\style.ts`
  against a `src/` prefix and matched nothing — the whole feature a no-op, presenting as the same
  empty `.nyc_output`. Any path predicate in this repo that a Windows machine will run gets the
  same `.replaceAll('\\', '/')`.
- **`.nyc_output/` is emptied per run** by a `globalSetup` ([scripts/ct-coverage-reset.mjs](scripts/ct-coverage-reset.mjs)),
  not by the yarn script, because the invocation that gets this wrong is the ad-hoc
  `CT_COVERAGE=1 playwright test --grep …`: it writes three files where the last full run left
  twenty-one, and the report sums all twenty-four without a word. It cannot be the fixture's job —
  workers are separate processes and each would delete the others' output mid-run.

**A DOM type in a signature is not the same as a DOM dependency**, and telling them apart is
worth doing before reaching for the exclude list. `isBackdropClick`, `shouldDismissOnBackdropClick`
and `finalizeModalClose` each asked for an `HTMLDialogElement` while reading one or two members of
it; narrowed to what they use (`BackdropDialog`, `Pick<HTMLDialogElement, 'open' | 'close'>`) they
became ordinary unit tests, and no call site changed. The same move `BackdropClickEvent` already
made for the event, and `applyStyle` after them — it writes through `setProperty` and
`removeProperty` and nothing else, so `StyleTarget` is those two.

**And a DOM function among pure ones is a file in the wrong place.** `clickHotkeyButton` was the
only thing in `utils/hotkey-utils.ts` that needed a document, and hosting it kept the whole module
out of the unit project's reach. It lives in `core/attach-keydown.ts` now — its only caller, already
DOM-only — and the module it left is fully covered.

So a partially-covered file in the report is either a genuine gap or a DOM branch, and both are
worth looking at. **If something is hard to unit-test because it is tangled with a renderer, that
is the finding** — extract the framework-free half into `core/` and test it there, the way the
action factory, the option resolution and the slide geometry were.

**The Solid binding is tested through a React CT harness that hosts a real Solid root**
([src/solid/\_\_tests\_\_/](src/solid/__tests__/)): the story renders a `<div>`, calls Solid's
`render` into it from an effect, and returns the disposer as the cleanup. Playwright's
`@playwright/experimental-ct-solid` stopped at 1.48 and does not track this version, and a second
CT project is not worth its own Vite config — this way both bindings are asserted against the same
browser, the same real `<dialog>` and the same top layer. The Solid harnesses use `h`
(`solid-js/h`) rather than JSX, so no Solid compiler enters the build; hyperscript detects the
getters an action's props carry and tracks them, so nothing about the reactivity is faked.

Colocated in `__tests__/` next to the file under test, named to match. The `unit` project is
rooted at the repo, so `playground/src/**/__tests__/*.test.ts` runs with the library's — a
helper is a helper wherever it ships.

**Every change to `src/` must ship with tests:** utils → `*.test.ts`, hooks → `*.ct.tsx` + `*.story.tsx`, bug fixes → regression test.

### Top-layer rule

`showModal()` places dialogs in the browser's top layer — native backdrop blocks clicks outside the `<dialog>`. Any button clickable while a modal is open must be inside the `render` callback. Multi-modal: call `dialogManager.open(id)` from inside the first modal's render. Applies to stories, tests, and playground examples.

**Non-modal dialogs never enter the top layer**, so their positioning depends on placement — see the `portal` doc in [core/types.ts](src/core/types.ts):

- `nonModal: true, portal: true` → portaled to `document.body`, viewport-anchored (`position: fixed`). Use for viewport-edge/centered non-modal panels.
- `nonModal: true, portal: false` → **contained**: rendered inside a library-owned wrapper that is itself `position: absolute; inset: 0` over your nearest sized, positioned ancestor, and positioned `absolute` against that wrapper. Absolute rather than an in-flow `relative` block because a `height: 100%` block is laid out _after_ the content it is meant to cover, pushing it out of a clipped region — see `CONTAINED_HOST` in [core/placement.ts](src/core/placement.ts). Immune to a transformed/`will-change` ancestor hijacking the containing block (the jump/flicker a `fixed` inline dialog hits), but it fills its nearest **sized** ancestor — provide a sized, positioned host or the panel collapses. Slide templates size to `100%` (not `100dvw/dvh`) in this mode.

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **Changelog**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), organized by date
- **Files**: kebab-case. **Exports**: PascalCase types/components, camelCase functions/hooks
- **Comments**: **why, not what** — and never the past (`used to`, `previously`, `no longer`); the CHANGELOG is the history. One dense sentence beats a paragraph; JSDoc on public API is the exception, it is the documentation.
- **No implicit returns**: every arrow function uses a block body with an explicit `return` (`arrow-body-style: ['error', 'always']`, auto-fixable via `yarn lint:fix`)
- **Optional props**: `| undefined` suffix (`onClose?: ((r: CloseResult) => void) | undefined`)
- **Type safety**: No `as` casts — use `Extract<Source, Target>` for narrowing, `satisfies` to prevent widening.
- **`createStore` type arguments**: prefer none — annotate the initial snapshot and the builder's return and let inference do the rest, the way `createModalStore` and the action engine do. Explicit arguments do resolve correctly (a builder is a function, so weak-type detection rules out the options overload before arity is consulted, and `createStore<Snap, Methods>(initial, builder)` reaches the domain overload); that resolution is pinned by the overload assertions in [create-store.test.ts](src/store/__tests__/create-store.test.ts) rather than left to be rediscovered.

## Key Constraints

- **React Compiler** (`babel-plugin-react-compiler`, target `'19'`): No `useMemo`/`useCallback`/`React.memo`. No ref writes during render. No property assignment on `useState` values. See [src/CLAUDE.md](src/CLAUDE.md#react-compiler) for full rules.
- **TypeScript strict**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`
- **Hotkeys**: `action('save', { hotkey: Key.Enter, onAction })` — no standalone `useHotkey`. Custom button wrappers **must forward `aria-keyshortcuts`** (and `data-focus-on-open`, which `action('cancel', { focusOnOpen: true })` sets to claim the modal's opening focus). See [src/CLAUDE.md](src/CLAUDE.md#hotkey-system).
- **The stack order is three keys, and only the middle one is a policy**: modality, then `dialogManager.prioritize((modal) => number)`, then open order. **Modality is a fact the policy cannot touch** — every non-modal dialog sits under every modal one, because the top layer paints above ordinary content and no `z-index` reaches between them, so a big number on a panel ranks it against the other panels and moves it no nearer the user. The policy is opt-in, once per project, higher is nearer the user, ties keep open order; it exists because "last `showModal()` wins" is a race between features that know nothing about each other, and losing it puts an interruption behind a panel. Reordering a **modal** dialog means `close()` + `showModal()` (the top layer ignores `z-index` — measured), so a raise fires the element's native `close` event and re-runs CSS keyed on `[open]`; a **non-modal** one is just a restamped `z-index`. `isForeground` moves with all of it, which is why it matters beyond paint: it decides who answers the dismiss key. A policy orders one manager's dialogs, not two copies of the library in one page. See [manager/stack-order.ts](src/manager/stack-order.ts) and `raiseDialog` in [core/dialog-lifecycle.ts](src/core/dialog-lifecycle.ts).
- **A dialog only answers for its own subtree**: a modal opened from inside another renders its `<dialog>` in that one's tree, so every event bubbles through the modal underneath. Keydown handling and hotkey dispatch are scoped with `utils/dialog-scope.ts` — without it one Escape unwinds the whole stack and a shared key fires at every level.
- **Actions are declared by use**: `action('confirm', handler)` inside `render` names the action and closes with `reason: 'confirm'`. There is no config and nothing to pass into `useModal`.
- **Declare the reasons**: `useModal<TData, 'save' | 'cancel'>`. Always do this — the `TReason = string` default accepts any string, which silently costs the typo-safety and the exhaustive `switch` in `onClose` that are the point of the design.
- **Environment**: Node >=24.0.0 | **Yarn 4** (via Corepack, pinned by `packageManager`) | React ^19.0.0 (optional peer — required only by `./react`) | Solid ^1.9.0 (optional peer — required only by `./solid`; `./vanilla` needs neither) | Chrome 138+ | ES2024, ESNext modules | Vite v8 (ESM). The **peer** ranges are what a consumer must satisfy and they are the wide ones; the repo's own `devDependencies` sit far above them (React 19.2.8, Solid 1.9.14) — quoting the dev pin as the requirement is how the README came to ask for more than the package does.
- **Package manager**: Yarn only — `yarn.lock` is authoritative, there is no `package-lock.json`. Use `yarn install --immutable` in CI. Dependency pins go in `resolutions` (npm's `overrides` is ignored by Yarn).
- **Yarn workspaces**: the repo is two packages — `umbra` (root, published) and `umbra-playground` (`playground/`, `private: true`). One `yarn install` at the root installs both. **The published package's dependency list is the root manifest**, so anything the demo needs — MUI, Emotion, TanStack Router, immer, react-syntax-highlighter — belongs in `playground/package.json` and must never be added to the root. The root's own `dependencies` stay empty: the library ships zero runtime dependencies. Root `dev`/`playground:*` scripts delegate via `yarn workspace umbra-playground <script>`.
- **Declarations**: emitted by `tsc -p tsconfig.build.json`, not a Vite plugin — so published types can't drift from what `type-check` validates. **Every relative import in `src/` carries a `.js` extension** (`'./types.js'`, `'../store/index.js'`) because `tsc` copies specifiers into the `.d.ts` verbatim and an extensionless one is invalid on `moduleResolution: node16`/`nodenext` — silently, under `skipLibCheck`. `yarn verify:package` fails on any that slip through.
- **TypeScript 7, and nothing beside it in the lint path**: every `tsc` call in `scripts` is `node node_modules/typescript-7/bin/tsc`, and linting is `oxlint --type-aware`, whose type-aware half runs through **tsgolint** — built on the TS 7 compiler, so the linter and `tsc` are the same compiler generation. The bare `typescript` **6.0.3** dependency now exists for **typedoc alone** (peer `6.0.x`), which is the last thing here that needs the old compiler API. TS 7 does ship a JS API — `typescript/unstable/sync`, `/async`, `/ast`, a client over the Go binary with `getExportsOfModule`, `getSymbolAtLocation` and `JSDocTagInfo` — so the blocker is that typedoc uses the _previous_ shape of it, not that there is nothing to use. Replacing typedoc is what collapses this to one TypeScript; the playground's `/api` page is built on its JSON model, so that is a change of its own.

  **`resolutions` cannot shortcut it**: `typescript` is a _peer_ of typedoc, not a dependency, so it resolves from this project's tree by design. Re-measure before believing a release note — as of 2026-08-13 typedoc 0.28.20 still declares `6.0.x`.

## Design Philosophy

- **Core is framework-agnostic**: anything that does not need a framework goes under the root
  and stays importable without a renderer. New logic belongs in the core unless it genuinely
  needs one — a binding should be thin enough that writing a second one is unremarkable, and
  `umbra/solid` is what holds that claim honest. **The test for "does this belong in the core"
  is now mechanical**: if adding it to one binding would mean adding it to the other, it is
  core. That is how the `attach*` functions, the action factory, the dialog attributes, the
  slide geometry and the default animation ended up there.
- **Headless-first**: zero shipped UI — never add UI components
- **Minimal surface**: extend `useModal` over adding template hooks
- **No abstraction leakage**: templates must not expose core internals
- **Bring your own everything**: animations, styling, layout are user-land

## What works with what

**Before writing a sentence about one feature meeting another, look in
[src/\_\_tests\_\_/compatibility-matrix.ts](src/__tests__/compatibility-matrix.ts).** It is the table
of options against options, capabilities against the three bindings, and features against the
platform — as data, rendered into `API.md`'s _Compatibility_ chapter by `yarn docs:matrix`, with a
test that fails when the document and the table disagree.

It exists because these facts were spread over this file, `src/CLAUDE.md`, `API.md`, the CHANGELOG and
a hundred JSDoc blocks, and prose in five places disagrees with itself in five places: **inventorying
the rows produced seven defects before a single cell was written.** So a new compatibility fact goes
in the table, not in prose here — and if it is about one module, it goes in that module's JSDoc.

Two things the vocabulary buys, and both are the reason to use it rather than a paragraph:

- **The two kinds of ✗ are different facts.** `✗ platform` is a browser law no implementation would
  change; `✗ by design` is a refusal that owes a reason. Neither is a to-do, and without the split a
  list of everything that does not work fills up with items nobody can act on.
- **`✓ untested` and `~` are declared states, so they enumerate.** `yarn docs:matrix` prints them, and
  that list _is_ the backlog — currently 20 cells.

The gate checks that every option has a row, that no row names an option that no longer exists, and
that every test a cell cites resolves to a real file and a real title. It **cannot** check that the
cited test proves the cell; that part stays human, and the JSDoc says so.

## Deeper Context

- **`src/`**: [src/CLAUDE.md](src/CLAUDE.md) — architecture, internal hooks, React Compiler rules, code organization
- **`playground/`**: [playground/CLAUDE.md](playground/CLAUDE.md) — templates, adding examples, shared utilities
