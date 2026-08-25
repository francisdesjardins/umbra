# Project Guidelines

Headless React dialog/modal library (`umbra`) — zero shipped UI (users bring their own: MUI, vanilla) and zero runtime dependencies (state layer is a hand-rolled reactive cell). See [CLAUDE.md](../CLAUDE.md) and [src/CLAUDE.md](../src/CLAUDE.md) for deeper context.

## Build and Test

```bash
yarn install                 # Install dependencies
yarn dev                 # Playground dev server (port 3000)
yarn build               # Library build: ESM (dist/esm/)
yarn type-check          # tsc --noEmit
yarn lint:fix            # oxlint (type-aware) with auto-fix
yarn format              # Code formatting
yarn verify:all          # Full validation: lint → type-check → build → package checks
yarn test                    # Run all tests (unit + component)
yarn test:ui             # Run all tests with Playwright UI
yarn test:unit           # Unit tests only (*.test.ts, Node, no browser)
yarn test:unit:coverage  # Unit tests with coverage (c8)
yarn test:unit:ui        # Unit tests with Playwright UI
yarn test:component      # Component tests only (*.ct.tsx, Chromium)
yarn test:component:ui   # Component tests with Playwright UI
```

### Testing conventions

Playwright with a unified `playwright.config.ts` — two projects: `unit` and `component`.

| Suffix        | Runner                   | When to use                |
| ------------- | ------------------------ | -------------------------- |
| `*.test.ts`   | Node (no browser)        | Pure utility functions     |
| `*.ct.tsx`    | Playwright CT (Chromium) | Hooks and components       |
| `*.story.tsx` | — imported by `*.ct.tsx` | Harness/fixture components |

Test files live in colocated `__tests__/` folders (e.g. `src/utils/__tests__/hotkey-utils.test.ts`).

**Every change to `src/` must include tests.** Story components must be declared at module scope (not inline in `test()` callbacks) and must follow React Compiler constraints — no `useMemo`/`useCallback`/`React.memo`.

**Top-layer button placement**: any button or control that must be clickable while a modal is open must live inside the modal's `render` function — not in the outer harness. The native top-layer backdrop blocks all clicks outside an open `<dialog>`. For multi-modal scenarios, call `dialogManager.open(id)` from inside the first modal's `render`.

## Code Style

- **Files**: kebab-case (`use-dialog.tsx`, `dialog-manager.ts`)
- **Exports**: PascalCase types/components, camelCase functions/hooks
- **Imports**: Inline type imports enforced — `import { useState, type ReactNode } from 'react'`
- **Optional props**: Always `| undefined` suffix — `readonly animation?: DialogAnimation | undefined` (required by `exactOptionalPropertyTypes`)
- **Curly braces**: Always required. **Arrow params**: Always parenthesized.
- **Unused vars**: Prefix with `_` to suppress lint errors
- **Enums**: Use `as const` objects, not TypeScript enums (see [src/utils/keys.ts](../src/utils/keys.ts))
- **Section comments**: Unicode box-drawing — `// ── Section Name ────────────────`

## Architecture

Two-layer design: core primitive (`useDialog`) + template hooks (`useMessageDialog`, `useSlideDialog`).

- **State**: Closure-based stores bridged to React via `useSyncExternalStore` — not `useState`/`useReducer`
- **Rendering**: Native `<dialog>` rendered inline by default (opt-in `portal: true` for `createPortal` to `document.body`); `dialog.showModal()` for backdrop + focus trapping
- **Actions**: declared by being rendered — `action('save', handler)` inside `render` returns `{ onClick, disabled, 'data-loading', 'aria-keyshortcuts'?: string | undefined }` to spread. **Every field is a DOM prop** — the core never guesses what your buttons are called, so the busy flag ships as `data-loading` and a wrapper maps it to its own (`loading` for MUI/Mantine, `busy` elsewhere). Declare the reasons on the hook (`useDialog<TData, 'save' | 'cancel'>`). Custom state via `createStore` alongside.
- **Public API**: the root is [src/index.ts](../src/index.ts), the React binding [src/react.ts](../src/react.ts). Internal hooks in `src/hooks/` are NOT exported.
- **Hotkeys**: declared on the action — `action('save', { hotkey: Key.Enter, onAction })` — not via a standalone `useHotkey` hook. Dispatch finds the button by `aria-keyshortcuts` — custom button wrappers **must forward that prop** or hotkeys silently break.

## Design Philosophy

These are hard constraints — never violate them when generating code:

- **Headless-first**: never add UI components to the library (`src/`). Zero shipped UI — users own all rendering.
- **Minimal surface**: prefer extending `useDialog` over adding new template hooks.
- **Asking vs instructing**: `dialogManager.open(id)` and `openAndWait(id)` instruct — the second waits for the close and resolves the same `[error, result]` tuple a hook does. `requestOpen(id, request)` asks and forgets; `requestOpenAndWait(id, request)` asks and returns an `OpenRequestOutcome` — the owner refuses with `request.refuse(reason)`, and acceptance is the default. Reach for the asking pair across an ownership boundary and the instructing one inside it. A payload crossing that boundary is `unknown` **in both directions** unless the id is in `DialogRegistry`: validate the request in `onOpenRequest`, and validate `outcome.closed`'s `data` before believing it.
- **Ids may be declared**: a project augments `DialogRegistry` to give an id its `closesWith` (the reasons, or a payload per reason) and its `opensWith`; declaring is optional and per modal, so an undeclared id must keep working everywhere. A payload declared for a reason is required when closing with it.
- **No abstraction leakage**: template hooks must not expose core internals (store, lifecycle refs, `DialogStoreSnapshot`).
- **Bring your own everything**: animations, styling, and layout are user-land concerns — do not bake them in.

## Project Conventions

### Commits & Changelog

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **Changelog**: Maintain `CHANGELOG.md` per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), organized by date

### React Compiler (babel-plugin-react-compiler, target '19')

- **Never use** `useMemo`, `useCallback`, or `React.memo` — compiler handles memoization
- **No ref writes during render** — use `useEffect` for ref updates; use `GetDialog` getter pattern instead of passing refs directly
- **Store creation**: `const [init] = useState(() => createStore())` — not `useRef` (avoids ref-tainting)
- **`createDialogStore` lives in its own module** ([src/core/dialog-store.ts](../src/core/dialog-store.ts)) — verified compiler-neutral: `useDialog` compiles to the same memo slots imported or colocated
- **`Map` writes are safe** — handler registries use `Map<string, handler>` (not treated as ref writes)
- **Stable identities**: `open()`, `openAndWait()` and `handle` keep the same reference for the life of the hook — use them directly in dependency arrays, no ref indirection

### TypeScript Strict Mode

- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` all enabled
- Generics default to `void`: `<TData = void>` — `CloseResult<TData>` stays a **plain** object (a conditional there would force a cast at every boundary the result crosses); with `TData = void`, `data` is an unusable `void | undefined`
- Go-style error tuples: `const [err, result] = await openAndWait()` (`AwaitedClose`) — never throws. There is no `waitForClose`: a close resolver answers the _next_ close, so registering one after the open can miss a close that landed during `prepare`, and `openAndWait` registers first. To observe a close you are not causing, use `onClose`
- Catch clauses: `catch (err: unknown)` → `normalizeError(err)` immediately
- No `any` without an `oxlint-disable` comment explaining why

### Error Handling

- Always `normalizeError()` from [src/utils/normalize-error.ts](../src/utils/normalize-error.ts) in catch blocks
- Fire-and-forget async: `void (async () => { try { ... } catch { ... } })()` (required by `no-floating-promises`)
- Log `.message` not full error: `log.error('desc', { id, error: error.message })`
- Async **coordination** is user-land, not library code: `createSingleFlight()`, `createMutex()`, `safeAwait` and the async-state helpers live in `playground/src/shared/lib/` as reference patterns to copy — a dialog manager is not where anyone looks for a mutex
- Store reset: generic stores expose `reset()` on the instance; domain stores reach it via the builder `api` (`reset() { api.reset(); }`). `reset(newSnapshot)` or `reset((initial) => next)` also updates the stored baseline
- Non-React store observation: `store.subscribe(listener)` plus `getSnapshot()` — that pair is the whole `StoreContract`, and it is exactly what `useSyncExternalStore` consumes
- Cross-store coordination: pass the other store (or a method reference) through context — no dispatch wrapper

### Playground Examples

- One file per example: `playground/src/pages/<route>/examples/<name>.tsx`
- Register in [codeSamples.ts](../playground/src/widgets/code-viewer/model/codeSamples.ts) via `?raw` import
- Add to route page via `ExampleCard` component
- UI templates live in `playground/src/entities/modal-template/ui/{mui,vanilla}/`
- Spacing: Use `gap`/`Stack` — vertical margin props (`mt`, `mb`, `marginTop`) are banned by lint

### MUI Templates & Shared Components — UI Templates page

The **UI Templates** page (`playground/src/pages/ui-templates/ui/UITemplatesPage.tsx`) is a living catalogue of all MUI template components and playground shared components. **Keep it in sync** whenever you:

- **Add a new component** to any of `playground/src/entities/modal-template/ui/mui/` (message-dialog, slide-dialog, form-dialog, panel-dialog, shared/content, shared/) or `playground/src/shared/ui/`:
  1. Add a `?raw` import for the new file in `playground/src/widgets/code-viewer/model/codeSamples.ts` following the `// MUI template components` section.
  2. Add a matching entry to the `codeSamples` record using the key convention: `template-<group>-<kebab-name>` for templates (e.g. `template-msg-my-new-component`) or `shared-component-<kebab-name>` for shared components.
  3. Add a `{ name: 'ComponentName', codeKey: '...' }` entry inside the correct `<TemplateSection>` in `UITemplatesPage.tsx`. Create a new `<TemplateSection>` block if it belongs to a new group.

- **Remove or rename a component**: remove or update its `?raw` import, `codeSamples` entry, and `UITemplatesPage.tsx` row together.

- **Add a new template group** (new sub-folder under `mui/`): add a new `<TemplateSection>` block in `UITemplatesPage.tsx` with a `<Divider>` separator above it, import all component files, and register them in `codeSamples`.

### Debug Logging

Enable: `localStorage.setItem('dialog:log', '*')`. Namespaces: `manager`, `outlet`, `modal`, `modal:lifecycle`, `modal:keydown`, `modal:click-outside`, `action`. Factory: `const log = createLogger('namespace')`.

## Integration Points

- **Peer deps**: `react ^19.0.0`, `react-dom ^19.0.0`. **Runtime deps**: none — the `src/store/` state layer is a hand-rolled reactive cell
- **Output**: ESM with `preserveModules` (tree-shakeable)
- **Vite v8**: Library mode; playground resolves `umbra` → `../src` via alias
- **CSS**: Injected via `adoptedStyleSheets` at runtime; CSS custom properties scoped to dialog inline style for micro-frontend isolation
