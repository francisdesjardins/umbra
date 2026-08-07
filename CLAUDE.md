# CLAUDE.md

Framework-agnostic dialog/modal manager, with React shipped as one binding over it. No UI
components exported; users bring their own.

## Entry points

The package root is plain TypeScript and **must resolve with React absent**. Bindings are the
optional layer.

| Specifier     | Contents                                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `umbra`       | `dialogManager`, `createDialogManager`, `dialogPlacement`, the store engine (`createStore`, `StoreContract`), `normalizeError`, `Key`, `matchesHotkey`, `formatHotkeyLabel`, `setLogLevel`. No React.             |
| `umbra/react` | `useModal`, `useMessageModal`, `useSlideModal`, `ModalOutlet`, `DialogManagerProvider`, `useDialogManager`, `useLookup` — **plus a wholesale re-export of the root**, so a React app imports from this path only. |

Adding a binding (Solid, Vue, a web component) means adding a sibling of `src/react.ts` and a
new `exports` entry. Nothing under the root changes.

**The root's React-freedom is a test, not a convention:**
[src/\_\_tests\_\_/root-react-free.test.ts](src/__tests__/root-react-free.test.ts) walks the real
import graph from `src/index.ts` and fails on any runtime `react` import (type-only imports are
erased, so those are fine). A companion assertion requires `src/react.ts` to come back dirty, so
the guard cannot pass by failing to resolve anything. `peerDependenciesMeta` marks `react` and
`react-dom` optional, which is the promise that test defends.

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
```

| Suffix        | Purpose                                 |
| ------------- | --------------------------------------- |
| `*.test.ts`   | Unit tests — pure functions, no browser |
| `*.ct.tsx`    | Component tests — Playwright CT         |
| `*.story.tsx` | Harness components imported by CT tests |

Colocated in `__tests__/` next to the file under test, named to match. The `unit` project is
rooted at the repo, so `playground/src/**/__tests__/*.test.ts` runs with the library's — a
helper is a helper wherever it ships.

**Every change to `src/` must ship with tests:** utils → `*.test.ts`, hooks → `*.ct.tsx` + `*.story.tsx`, bug fixes → regression test.

### Top-layer rule

`showModal()` places dialogs in the browser's top layer — native backdrop blocks clicks outside the `<dialog>`. Any button clickable while a modal is open must be inside the `render` callback. Multi-modal: call `dialogManager.open(id)` from inside the first modal's render. Applies to stories, tests, and playground examples.

**Non-modal dialogs never enter the top layer**, so their positioning depends on placement — see the `portal` doc in [core/types.ts](src/core/types.ts):

- `nonModal: true, portal: true` → portaled to `document.body`, viewport-anchored (`position: fixed`). Use for viewport-edge/centered non-modal panels.
- `nonModal: true, portal: false` → **contained**: rendered inside a library-owned `position: relative` wrapper and positioned `absolute` against it. Immune to a transformed/`will-change` ancestor hijacking the containing block (the jump/flicker a `fixed` inline dialog hits), but it fills its nearest **sized** ancestor — provide a sized, positioned host or the panel collapses. Slide templates size to `100%` (not `100dvw/dvh`) in this mode.

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
- **A dialog only answers for its own subtree**: a modal opened from inside another renders its `<dialog>` in that one's tree, so every event bubbles through the modal underneath. Keydown handling and hotkey dispatch are scoped with `utils/dialog-scope.ts` — without it one Escape unwinds the whole stack and a shared key fires at every level.
- **Actions are declared by use**: `action('confirm', handler)` inside `render` names the action and closes with `reason: 'confirm'`. There is no config and nothing to pass into `useModal`.
- **Declare the reasons**: `useModal<TData, 'save' | 'cancel'>`. Always do this — the `TReason = string` default accepts any string, which silently costs the typo-safety and the exhaustive `switch` in `onClose` that are the point of the design.
- **Environment**: Node >=24.0.0 | **Yarn 4** (via Corepack, pinned by `packageManager`) | React ^19.2.4 (optional peer — required only by `./react`) | Chrome 138+ | ES2024, ESNext modules | Vite v8 (ESM)
- **Package manager**: Yarn only — `yarn.lock` is authoritative, there is no `package-lock.json`. Use `yarn install --immutable` in CI. Dependency pins go in `resolutions` (npm's `overrides` is ignored by Yarn).
- **Yarn workspaces**: the repo is two packages — `umbra` (root, published) and `umbra-playground` (`playground/`, `private: true`). One `yarn install` at the root installs both. **The published package's dependency list is the root manifest**, so anything the demo needs — MUI, Emotion, TanStack Router, zod, immer, react-syntax-highlighter — belongs in `playground/package.json` and must never be added to the root. The root's own `dependencies` stay empty: the library ships zero runtime dependencies. Root `dev`/`playground:*` scripts delegate via `yarn workspace umbra-playground <script>`.
- **Declarations**: emitted by `tsc -p tsconfig.build.json`, not a Vite plugin — so published types can't drift from what `type-check` validates. **Every relative import in `src/` carries a `.js` extension** (`'./types.js'`, `'../store/index.js'`) because `tsc` copies specifiers into the `.d.ts` verbatim and an extensionless one is invalid on `moduleResolution: node16`/`nodenext` — silently, under `skipLibCheck`. `yarn verify:package` fails on any that slip through.
- **TypeScript 7 side-by-side (important)**: the project compiles with **TS 7** via the `typescript-7` alias — every `tsc` call in `scripts` is `node node_modules/typescript-7/bin/tsc`. The bare `typescript` dependency is **6.0.3** and exists only for tools that cannot run on TS 7 yet: `typescript-eslint` (hard-blocks TS ≥ 7 — and TS 7 genuinely removed the enum API `typescript-estree` needs: `ts.Extension`, `ts.ModuleKind`, `ts.ScriptTarget`, `ts.JsxEmit` are all gone) and `typedoc` (peer ≤ 6.0.x). This is the side-by-side setup TypeScript's own 7.0 announcement recommends. **Do not "fix" this by patching typescript-eslint's version gate** — the gate is real, not cosmetic. Collapse back to a single TypeScript once typescript-eslint ships TS 7 support ([issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).

  **Tested on 2026-08-05 with typescript-eslint 8.66.0 and typedoc 0.28.20 — still blocked.** Pointing `typescript` at 7.0.2 installs fine (peer warnings only), then `eslint` exits with `Error: typescript-eslint does not support TS 7.0` and typedoc throws `Cannot read properties of undefined (reading 'PropertyDeclaration')`. Both still declare TS 6 ceilings in their peers (`typescript-estree` at `>=4.8.4 <6.1.0`, typedoc at `6.0.x`). Re-run that experiment before believing a release note; replacing typedoc alone does not help, because typescript-eslint is the binding constraint. **`resolutions` cannot fix it either** — `typescript` is a _peer_ of `typescript-estree`, not a dependency, so it resolves from this project's tree by design (a linter has to parse your code with your compiler). There is no arrangement in which the tools see a different TypeScript than `tsc` does.

## Design Philosophy

- **Core is framework-agnostic**: anything that does not need a framework goes under the root
  and stays importable without React. New logic belongs in the core unless it genuinely needs
  a renderer — a binding should be thin enough that writing a second one is unremarkable.
- **Headless-first**: zero shipped UI — never add UI components
- **Minimal surface**: extend `useModal` over adding template hooks
- **No abstraction leakage**: templates must not expose core internals
- **Bring your own everything**: animations, styling, layout are user-land

## Deeper Context

- **`src/`**: [src/CLAUDE.md](src/CLAUDE.md) — architecture, internal hooks, React Compiler rules, code organization
- **`playground/`**: [playground/CLAUDE.md](playground/CLAUDE.md) — templates, adding examples, shared utilities
