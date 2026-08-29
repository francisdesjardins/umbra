# CLAUDE.md

Framework-agnostic dialog manager, with React, Solid and vanilla shipped as three bindings
over it. No UI components exported; users bring their own.

**Every `CLAUDE.md` carries a word budget, deliberately left with 10% of headroom. Spend it rather
than shave prose to fit** — see [doc-budget.test.ts](src/__tests__/doc-budget.test.ts).

## Entry points

The package root is plain TypeScript and **must resolve with no framework installed**; bindings are
the optional layer.

| Specifier       | Contents                                                                                                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `umbra`         | The manager, `DialogRegistry`, placement and style, the store engine, the hotkey utilities, `normalizeError`, `setLogLevel`. No framework; `src/index.ts` is the list.                                                           |
| `umbra/react`   | `useDialog`, `useMessageDialog`, `useSlideDialog`, `DialogOutlet`, `DialogManagerProvider`, `useDialogManager`, `useLookup` — **plus a wholesale re-export of the root**, so a React app imports from this path only.            |
| `umbra/solid`   | The same names, for Solid, plus `fromStore` — and the same wholesale re-export of the root.                                                                                                                                      |
| `umbra/vanilla` | `bindDialog` — a _controller_ for a `<dialog>` you wrote yourself, whose `bindAction` is a member of the returned controller rather than an export. No `render`, no `Dialog`, no outlet, no framework. Same wholesale re-export. |

**There are two kinds of binding, and the distinction is load-bearing.**

_Hook_ bindings — `./react` and `./solid` — **render**: a `render` callback returns the content and
the binding returns a `Dialog` to place. They share a surface down to the file names, so a team
running both writes the same dialog twice with the same words. Three differences, all the renderer's:
Solid's live values are getters over signals — so **do not destructure the render args** —
`useLookup` returns an accessor, and `portal: true` mounts the dialog itself, leaving `Dialog` as
`null`.

The _controller_ binding — `./vanilla` — **does not render**, and could not without the library
shipping a renderer, the one thing it refuses to do. The `<dialog>` and its contents are markup the
caller already wrote; `bindDialog` drives the lifecycle over it. So it has no `render`, no `Dialog`
and no outlet, and it gains `bindAction(button, { reason })`, which does the half a renderer does
elsewhere. `binding-parity.test.ts` knows the difference and asserts each kind's own shape.

Adding a fourth binding means a sibling of `src/react.ts` and a new `exports` entry; nothing under
the root changes. What it inherits, and what those six numbered steps are, is
[src/CLAUDE.md](src/CLAUDE.md#what-a-binding-actually-does).

**Entry-point isolation is a test, not a convention:**
[src/\_\_tests\_\_/entry-isolation.test.ts](src/__tests__/entry-isolation.test.ts) walks the real
import graph from each entry and asserts that the root reaches no framework, that each hook binding
reaches its own and only its own, and that `./vanilla` reaches none (type-only imports are erased).
The positive halves are what stop the root's assertion from passing because the walker resolved
nothing. `peerDependenciesMeta` marks the three optional, which is the promise those tests defend,
and `verify:package` re-checks all of it against the built artifact.

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
yarn coverage:update    # Run both coverage measurements and rewrite README + CLAUDE.md + badges
```

## Testing

Playwright for unit + component tests (`playwright.config.ts`).

```bash
yarn test                    # All tests (unit + component)
yarn test:unit               # Unit tests only (*.test.ts)
yarn test:component          # Component tests only (*.ct.tsx)
yarn test:unit:coverage      # Unit tests with coverage (c8)
yarn test:component:coverage # Component tests with coverage (istanbul, see below)
```

Every one of those has a `:ui` variant that opens the Playwright UI.

| Suffix        | Purpose                                 |
| ------------- | --------------------------------------- |
| `*.test.ts`   | Unit tests — pure functions, no browser |
| `*.ct.tsx`    | Component tests — Playwright CT         |
| `*.story.tsx` | Harness components imported by CT tests |

**Two tags move a test off the default projects and onto one that can answer it**, and both are
config-level rather than a condition inside a test, so a run says plainly what it covered.
`@focus-dependent` needs the one worker that holds the browser's focus. `@touch` needs a
**touchscreen** — a device, not an engine, so the touch projects change `hasTouch` and nothing else:
a mobile descriptor would move the viewport, the scale factor and the user agent at once, and a red
test would not say which of the four it was about. `@touch-cdp` is the subset that needs a _moving_
finger, which only `Input.dispatchTouchEvent` over CDP produces, so it is Chromium's alone. Gecko has
no touch leg — Playwright cannot emulate one there.

### What coverage measures

Two reports, because one project cannot reach the whole library.

`yarn test:unit:coverage` measures the **unit** project — Node, no DOM — so `.c8rc.json`'s exclude
list is not a way to make a number look better, it is the statement of what that project can reach.
Three groups: type-only modules, **every binding** (globbed, because a new file there is
component-test territory), and the DOM-only core modules — listed **one by one**, so a new module
shows up as a gap until someone decides which kind it is. The line is _zero_ reachable runtime in
Node; a file with a testable half stays visible and partially covered.

`yarn test:component:coverage` is the other half and exists so the first list is honest. Opt-in
(`CT_COVERAGE=1`) because instrumentation costs about 45% of the run. Measured 2026-08-29: **91.44% over 55 files**, against unit's **96.59%**. Never add them; re-measure both or neither — **and the
pair is quoted twice**, here and in [README.md](README.md#development), which also carries two
badges from it. Moving one copy is how the README came to be two points behind, which is why
**`yarn coverage:update` does the whole move**: both measurements, both documents, both badges, one
command — its patterns fail loudly if this prose is reworded.

**So a partially-covered file is either a genuine gap or a DOM branch, and both are worth a look.**
Three moves, in order. **A DOM type in a signature is not a DOM dependency** — narrow the parameter
to the members actually read (`BackdropDialog`, `Pick<HTMLDialogElement, 'open' | 'close'>`,
`StyleTarget`) and the function becomes an ordinary unit test, no call site changed. **A function of
the minority kind is a file in the wrong place** — a DOM one among pure ones, or the reverse, keeps
its whole module out of reach. And **hard to unit-test because it is tangled with a renderer is the
finding**: extract the framework-free half into `core/`.

**Coverage is a local command, not a CI job, deliberately.** GitHub's upload is Cobertura-only and
404s here (Code Quality needs an enterprise owner; this is a personal repo), and publishing an
artifact nobody opens costs the component job ~45% more runtime. Do not re-add it unless the repo
moves under an enterprise **and** something renders the result.

**Every way the CT report has failed has failed quietly**, so each failure mode is documented where
it bites and `scripts/ct-coverage-report.mjs` prints them all when it finds nothing. The one in no
file: editing the instrumenter invalidates neither CT cache, so delete `playwright/.cache-coverage/`
by hand.

### Top-layer rule

`showModal()` places dialogs in the browser's top layer, whose native backdrop blocks clicks outside the `<dialog>`. Any button clickable while a dialog is open must be inside the `render` callback; multi-dialog means calling `dialogManager.open(id)` from inside the first dialog's render. Applies to stories, tests and playground examples.

**Non-modal dialogs never enter the top layer**, so their positioning depends on placement — see the `portal` doc in [core/types.ts](src/core/types.ts):

- `nonModal: true, portal: true` → portaled to `document.body`, viewport-anchored (`position: fixed`). Use for viewport-edge/centered non-modal panels.
- `nonModal: true, portal: false` → **contained**: rendered inside a library-owned wrapper that is `position: absolute; inset: 0` over your nearest sized, positioned ancestor, and positioned `absolute` against that wrapper — `CONTAINED_HOST` in [core/placement.ts](src/core/placement.ts) says why absolute rather than an in-flow block. Immune to a transformed ancestor hijacking the containing block (the jump a `fixed` inline dialog hits), but it fills its nearest **sized** ancestor — provide a sized, positioned host or the panel collapses. Slide templates size to `100%` (not `100dvw/dvh`) here.

## Conventions

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **Changelog**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), by date
- **Files**: kebab-case. **Exports**: PascalCase types/components, camelCase functions/hooks
- **Comments**: **why, not what** — and never the past (`used to`, `previously`); the CHANGELOG is
  the history. One dense sentence beats a paragraph; JSDoc on public API is the exception, being
  the documentation. **All of that is a gate** —
  [comment-budget.test.ts](src/__tests__/comment-budget.test.ts) carries the budgets, the two ways
  the public-API exception is read, and the one seam it cannot close.
- **No implicit returns**: every arrow function uses a block body with an explicit `return` (`arrow-body-style: ['error', 'always']`, `yarn lint:fix` auto-fixes)
- **Optional props**: `| undefined` suffix (`onClose?: ((r: CloseResult) => void) | undefined`)
- **Type safety**: No `as` casts — use `Extract<Source, Target>` for narrowing, `satisfies` to prevent widening.
- **`createStore` type arguments**: prefer none — annotate the initial snapshot and the builder's return and let inference do the rest, the way `createDialogStore` and the action engine do. Explicit arguments do resolve correctly (a builder is a function, so weak-type detection rules out the options overload before arity is consulted); that resolution is pinned by the overload assertions in [create-store.test.ts](src/store/__tests__/create-store.test.ts) rather than left to be rediscovered.

## Key Constraints

- **React Compiler** (`babel-plugin-react-compiler`, target `'19'`): no `useMemo`/`useCallback`/`React.memo`, no ref writes during render, no property assignment on `useState` values. Full rules in [src/CLAUDE.md](src/CLAUDE.md#react-compiler).
- **TypeScript strict**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`
- **Hotkeys**: `action('save', { hotkey: Key.Enter, onAction })` — no standalone `useHotkey`. Custom button wrappers **must forward three props** — `aria-keyshortcuts`, `data-focus-on-open`, `data-action-reason` — because all three are queried out of the DOM, so dropping one makes that feature silently do nothing. See [src/CLAUDE.md](src/CLAUDE.md#hotkey-system).
- **The stack order is three keys, and only the middle one is a policy**: modality, then `dialogManager.prioritize((dialog) => number)`, then open order. **Modality is a fact the policy cannot touch** — the top layer paints above ordinary content and no `z-index` reaches between them, so a big number on a panel ranks it against the other panels and moves it no nearer the user. Order decides who answers the dismiss key, which is why `isForeground` matters beyond paint. The rules are on `prioritize`, the cost of reordering a modal dialog on `raiseDialog` ([core/dialog-lifecycle.ts](src/core/dialog-lifecycle.ts)), the limits in the matrix.
- **A dialog only answers for its own subtree**: a dialog opened from inside another renders its `<dialog>` in that one's tree, so every event bubbles through the dialog underneath. `utils/dialog-scope.ts` scopes keydown handling and hotkey dispatch — without it one Escape unwinds the whole stack.
- **Actions are declared by use**: `action('confirm', handler)` inside `render` names the action and closes with `reason: 'confirm'`. No config, nothing to pass into `useDialog`.
- **Declare the reasons**: `useDialog<TData, 'save' | 'cancel'>`, or name them once in `DialogRegistry` — `closesWith: 'save' | 'cancel'`, or `closesWith: { save: Doc; cancel: void }` to give each reason its own payload, which is then **required** where declared. The `TReason = string` default accepts any string, silently costing the typo-safety and the exhaustive `switch` in `onClose` that are the point of the design.
- **Environment**: Node >=24 | **Yarn 4** (Corepack, pinned by `packageManager`) | React ^19.0.0 and
  Solid ^1.9.0 as optional peers, each required only by its own binding and neither by `./vanilla` |
  Chrome/Edge 110+, Safari 16.4+, Firefox 115+ | ES2024, ESNext modules | Vite v8. **The peer ranges
  are the requirement, not this repo's `devDependencies`**, which sit far above them; quoting a dev
  pin asks for more than the package does. **The browser floor is measured** — the highest thing the
  runtime calls: constructed `CSSStyleSheet` (Safari 16.4), `toSorted` (Chrome 110, Firefox 115).
- **Package manager**: Yarn only — `yarn.lock` is authoritative and `yarn install --immutable` is the CI form. Dependency pins go in `resolutions`; npm's `overrides` is ignored.
- **Yarn workspaces**: two packages — `umbra` (root, published) and `umbra-playground`
  (`playground/`, private); one `yarn install` at the root installs both. **The published dependency
  list is the root manifest**, so anything the demo needs belongs in `playground/package.json` and
  never in the root, whose `dependencies` stay empty. Root `dev`/`playground:*` scripts delegate.
- **Declarations**: emitted by `tsc -p tsconfig.build.json`, not a Vite plugin, so published types can't drift from what `type-check` validates. **Every relative import in `src/` carries a `.js` extension** — `tsc` copies specifiers into the `.d.ts` verbatim and an extensionless one is invalid on `moduleResolution: node16`/`nodenext`, silently under `skipLibCheck`. `yarn verify:package` fails on any that slip through.
- **TypeScript 7, and nothing beside it in the lint path**: every `tsc` call in `scripts` is
  `node node_modules/typescript-7/bin/tsc`, and `oxlint --type-aware` runs its type-aware half
  through **tsgolint**, built on the TS 7 compiler — so the linter and `tsc` are one generation.
  **The bare `typescript` 6.0.3 is typedoc's**, which peers on `6.0.x` (a peer `resolutions` cannot
  shortcut), and the editor's, since `typescript-7/lib` ships no `tsserver.js` — so IntelliSense
  stays a generation behind the gates, and `options.typeAware` in `.oxlintrc.json` covers most of
  that cost. Collapsing to one TypeScript means replacing typedoc; the matrix row holds what blocks
  that and when it was last re-measured.

## Design Philosophy

- **Core is framework-agnostic**: anything that does not need a framework goes under the root
  and stays importable without a renderer. A binding should be thin enough that writing a second
  one is unremarkable, and `umbra/solid` is what holds that claim honest. **The test is
  mechanical**: if adding it to one binding would mean adding it to the other, it is core — which
  is how the `attach*` functions, the action factory, the dialog attributes, the slide geometry
  and the default animation ended up there.
- **Headless-first**: zero shipped UI — never add UI components
- **Minimal surface**: extend `useDialog` over adding template hooks
- **No abstraction leakage**: templates must not expose core internals
- **Bring your own everything**: animations, styling, layout are user-land

## What works with what

**Before writing a sentence about one feature meeting another, look in
[src/\_\_tests\_\_/compatibility-matrix.ts](src/__tests__/compatibility-matrix.ts).** It is the table
of options against options, capabilities against the three bindings, and features against the
platform — as data, rendered into `API.md`'s _Compatibility_ chapter by `yarn docs:matrix`, with a
test that fails when the document and the table disagree.

It exists because these facts were spread over five places that disagreed with each other:
**inventorying the rows produced seven defects before a cell was written.** So a new compatibility
fact goes in the table, not in prose here — and if it is about one module, in that module's JSDoc.

Five things the vocabulary buys:

- **The two kinds of ✗ are different facts.** `✗ platform` is a browser law; `✗ by design` is a
  refusal that owes a reason — carried in `why`, which the gate requires of it and of `~`. Neither is
  a to-do, and without the split a list of what does not work fills with items nobody can act on.
- **`✓ untested` and `~` are declared states, so they enumerate.** **`yarn todo`** prints them and
  that list _is_ the backlog, from the same data. A `TODO.md` would be a second answer that drifts.
- **A `✓` can still carry an open question**, through `caveat` — a claim proven on one binding and
  not the others. The enumeration reads the _state_, and the state says done, so in a note it would
  reach a reader of the table and not the backlog. `yarn todo` lists caveats prefixed `?`. **A
  caveat owes a `question` and a `nextStep`**, both gated: one nobody can name a next step for is a
  `note`, which is what two of the first four turned out to be.
- **`⏸ blocked` is not work and does not print as work.** A cell waiting on typedoc's peer range or
  on a WebKit release is neither half-working nor fixable here, so it owes a `recheck` — what to look
  at, and the ISO date someone last did — and `yarn todo` returns it in a **second** list. Filing
  those beside real work is what made a ten-item backlog unfinishable by construction.
- **Every open cell carries a `since`**, and `yarn todo` sorts by it and prints the age —
  deliberately instead of a threshold on the count: six `~` for ten days reads exactly like six
  closed and six opened.

The gate checks that every option has a row, that no row names an option that no longer exists, that
every cited test resolves to a real file and title, that a refusal carries its `why`, that a
`⏸` carries its `recheck`, and that a caveat carries both halves. It cannot check that the cited
test proves the cell; that part stays human.

## Deeper Context

- **`src/`**: [src/CLAUDE.md](src/CLAUDE.md) — architecture, internal hooks, React Compiler rules, code organization
- **`playground/`**: [playground/CLAUDE.md](playground/CLAUDE.md) — templates, adding examples, shared utilities
