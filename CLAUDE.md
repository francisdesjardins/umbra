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

Two reports, because one project cannot reach the whole library.

`yarn test:unit:coverage` measures the **unit** project — Node, no DOM — so the exclude list in
`.c8rc.json` is not a way to make a number look better, it is the statement of what that project can
reach. Three groups, and each entry says which: type-only modules (no runtime at all), **every
binding** (`src/react/**`, `src/solid/**`, `src/vanilla/**`, globbed, because a new file there is
component-test territory), and the DOM-only core modules — listed **one by one**, so a new module
shows up as a gap until someone decides which kind it is. The line is _zero_ reachable runtime in
Node; a file with a testable half stays visible and partially covered.

`yarn test:component:coverage` is the other half and exists so the first list is honest. Opt-in
(`CT_COVERAGE=1`) because instrumentation costs about 45% of the run. Measured 2026-08-13: **91.95%
over 50 files**, against unit's **93.83%**. Never add them — each measures what the other cannot
reach — and re-measure both together or neither.

**So a partially-covered file is either a genuine gap or a DOM branch, and both are worth a look.** Two
moves have paid off repeatedly and are the first thing to try:

- **A DOM type in a signature is not a DOM dependency.** `isBackdropClick`,
  `shouldDismissOnBackdropClick` and `finalizeModalClose` each asked for an `HTMLDialogElement` while
  reading one or two members; narrowed to what they use (`BackdropDialog`,
  `Pick<HTMLDialogElement, 'open' | 'close'>`) they became ordinary unit tests and no call site
  changed. `applyStyle` did the same with `StyleTarget`.
- **A DOM function among pure ones is a file in the wrong place.** `clickHotkeyButton` kept the whole
  of `utils/hotkey-utils.ts` out of the unit project's reach; it lives in `core/attach-keydown.ts` now
  — its only caller, already DOM-only — and the module it left is fully covered.

**If something is hard to unit-test because it is tangled with a renderer, that is the finding**:
extract the framework-free half into `core/` and test it there.

**Coverage is a local command, not a CI job, and that is deliberate.** GitHub's code-coverage upload is
Cobertura-only and returns HTTP 404 here, because Code Quality is gated on an enterprise owner
allowing it and this is a personal repository. Running the coverage variants in CI to publish an
artifact nobody opens costs the component job roughly 45% more runtime. Do not re-add it unless the
repo moves under an enterprise **and** something renders the result.

**Every way the CT report has failed so far has failed quietly**, which is why the reasoning lives with
the machinery rather than here — four failure modes, each documented where it can bite: instrumentation
must be `enforce: 'pre'` on the file as written ([scripts/vite-plugin-ct-coverage.mjs](scripts/vite-plugin-ct-coverage.mjs)),
there are **two** CT build caches keyed on sources rather than on the plugin list
([playwright.config.ts](playwright.config.ts)'s `use.ctCacheDir`), path predicates are
separator-normalised or they no-op on Windows, and `.nyc_output/` is emptied by a `globalSetup`
([scripts/ct-coverage-reset.mjs](scripts/ct-coverage-reset.mjs)) rather than by the yarn script, because
the invocation that gets it wrong is an ad-hoc `--grep`. `ct-coverage-report.mjs` prints all four when
it finds nothing. Editing the instrumenter invalidates neither cache — delete
`playwright/.cache-coverage/` by hand for that one.

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
- **The stack order is three keys, and only the middle one is a policy**: modality, then `dialogManager.prioritize((modal) => number)`, then open order. **Modality is a fact the policy cannot touch** — the top layer paints above ordinary content and no `z-index` reaches between them, so a big number on a panel ranks it against the other panels and moves it no nearer the user. The policy is opt-in, once per project, higher is nearer the user, ties keep open order; it exists because "last `showModal()` wins" is a race between features that know nothing about each other. Reordering a **modal** dialog means `close()` + `showModal()` and nothing cheaper, with three unavoidable costs; a **non-modal** one is a restamped `z-index`. `isForeground` moves with all of it, which is why it matters beyond paint: it decides who answers the dismiss key. See [manager/stack-order.ts](src/manager/stack-order.ts) and `raiseDialog` in [core/dialog-lifecycle.ts](src/core/dialog-lifecycle.ts) for the costs, and the compatibility matrix for what a policy cannot do.
- **A dialog only answers for its own subtree**: a modal opened from inside another renders its `<dialog>` in that one's tree, so every event bubbles through the modal underneath. Keydown handling and hotkey dispatch are scoped with `utils/dialog-scope.ts` — without it one Escape unwinds the whole stack and a shared key fires at every level.
- **Actions are declared by use**: `action('confirm', handler)` inside `render` names the action and closes with `reason: 'confirm'`. There is no config and nothing to pass into `useModal`.
- **Declare the reasons**: `useModal<TData, 'save' | 'cancel'>`. Always do this — the `TReason = string` default accepts any string, which silently costs the typo-safety and the exhaustive `switch` in `onClose` that are the point of the design.
- **Environment**: Node >=24.0.0 | **Yarn 4** (via Corepack, pinned by `packageManager`) | React ^19.0.0 (optional peer — required only by `./react`) | Solid ^1.9.0 (optional peer — required only by `./solid`; `./vanilla` needs neither) | Chrome/Edge 110+, Safari 16.4+, Firefox 115+ | ES2024, ESNext modules | Vite v8 (ESM). The **peer** ranges are what a consumer must satisfy and they are the wide ones; the repo's own `devDependencies` sit far above them (React 19.2.8, Solid 1.9.14) — quoting the dev pin as the requirement is how the README came to ask for more than the package does. **The browser floor is measured the same way**: the highest thing the runtime calls — constructed `CSSStyleSheet` (Safari 16.4), `toSorted` (Chrome 110, Firefox 115). `popover` and `@starting-style` appear only in comments, so neither binds; only Chromium is exercised.
- **Package manager**: Yarn only — `yarn.lock` is authoritative, there is no `package-lock.json`. Use `yarn install --immutable` in CI. Dependency pins go in `resolutions` (npm's `overrides` is ignored by Yarn).
- **Yarn workspaces**: the repo is two packages — `umbra` (root, published) and `umbra-playground` (`playground/`, `private: true`). One `yarn install` at the root installs both. **The published package's dependency list is the root manifest**, so anything the demo needs — MUI, Emotion, TanStack Router, immer, react-syntax-highlighter — belongs in `playground/package.json` and must never be added to the root. The root's own `dependencies` stay empty: the library ships zero runtime dependencies. Root `dev`/`playground:*` scripts delegate via `yarn workspace umbra-playground <script>`.
- **Declarations**: emitted by `tsc -p tsconfig.build.json`, not a Vite plugin — so published types can't drift from what `type-check` validates. **Every relative import in `src/` carries a `.js` extension** (`'./types.js'`, `'../store/index.js'`) because `tsc` copies specifiers into the `.d.ts` verbatim and an extensionless one is invalid on `moduleResolution: node16`/`nodenext` — silently, under `skipLibCheck`. `yarn verify:package` fails on any that slip through.
- **TypeScript 7, and nothing beside it in the lint path**: every `tsc` call in `scripts` is `node node_modules/typescript-7/bin/tsc`, and linting is `oxlint --type-aware`, whose type-aware half runs through **tsgolint** — built on the TS 7 compiler, so the linter and `tsc` are the same compiler generation. The bare `typescript` **6.0.3** dependency exists for **typedoc** (peer `6.0.x`), the last thing here that needs the old compiler API — **and, in practice, for the editor**: `typescript-7/lib` ships `tsc.js` and no `tsserver.js`, so `js/ts.tsdk.path` in [.vscode/settings.json](.vscode/settings.json) has nowhere else to point. The pin is currently a no-op — VS Code 1.133 bundles 6.0.3 itself, the same version — but either way IntelliSense is a compiler generation behind the gates that judge the same file, and no setting fixes that while TS 7 ships no language server. Type-aware `oxlint` in the editor is what covers most of what that costs, which is why `options.typeAware` is set in the config rather than only passed on the CLI. TS 7 does ship a JS API — `typescript/unstable/sync`, `/async`, `/ast`, a client over the Go binary with `getExportsOfModule`, `getSymbolAtLocation` and `JSDocTagInfo` — so the blocker is that typedoc uses the _previous_ shape of it, not that there is nothing to use. Replacing typedoc is what collapses this to one TypeScript; the playground's `/api` page is built on its JSON model, so that is a change of its own.

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
- **`✓ untested` and `~` are declared states, so they enumerate.** **`yarn todo`** prints them, and that
  list _is_ the backlog — there is one place to ask "is anything still open", and it is generated from
  the same data the document is rather than kept beside it. A `TODO.md` would be a second answer that
  drifts from the first.
- **A `✓` can still carry an open question**, through `caveat` — a claim proven on one binding and not
  the others, a discrimination that does not reproduce. Written into the note instead, it would reach a
  reader of the table and not the backlog, because the _state_ is what the enumeration reads and the
  state says done. `yarn todo` lists caveats separately, prefixed `?`.

The gate checks that every option has a row, that no row names an option that no longer exists, and
that every test a cell cites resolves to a real file and a real title. It **cannot** check that the
cited test proves the cell; that part stays human, and the JSDoc says so.

## Deeper Context

- **`src/`**: [src/CLAUDE.md](src/CLAUDE.md) — architecture, internal hooks, React Compiler rules, code organization
- **`playground/`**: [playground/CLAUDE.md](playground/CLAUDE.md) — templates, adding examples, shared utilities
