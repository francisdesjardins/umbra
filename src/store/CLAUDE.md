# Store Module — State Layer

The library's reactive state layer. **A hand-rolled reactive cell with zero runtime dependencies** — the cell and shallow equality are both in-house.

## The swap rule

This folder is the **single swap point** for the state manager. Nothing outside `src/store/` reaches into its internals — the rest of the codebase imports store primitives from `src/store/` (internally) or from `umbra/react` (playground). To change the engine, reimplement these files; consumers don't change.

**The module is split across two package entry points.** The engine — `createStore`, `watch`, `shallowEqual` — is framework-agnostic and ships from the package root. Its React bindings — `useStore`, `createStoreContext` — ship from `umbra/react`. A store's public shape is a subscribe + getter pair, which is what `useSyncExternalStore` consumes directly, so a non-React caller uses the engine with no adapter and a future binding needs nothing new here.

The split is physical, not just conceptual: the engine is `src/store/`, the bindings are [`src/store/react/`](react/) behind their own barrel. That is what lets any core module import `../store` freely — with the bindings beside the engine, the barrel dragged React into the framework-free root's import graph and the guarantee rested on tree-shaking.

## Why a store module at all

The whole thing is small (a `Set` of listeners + `get`/`set`), but the module still earns its place:

- **POJO snapshots** — methods live beside the state (in the builder), never inside it, so `getSnapshot()` is clone/serialize-safe and selector-stable.
- **One flat API** — `set(next | (prev) => next)`, `reset()`, and context injection folded into a zustand-style flat store.
- **`useSyncExternalStore` contract** — every store satisfies `{ subscribe, getSnapshot }`, so `useStore` / `watch` / `createStoreContext` all compose over one shape.

## Two store modes

- **Generic** — `createStore(initial, options?)`, no builder. The built-in mutators (`set`, `reset`) are exposed on the instance. Use for a plain reactive cell.
- **Domain** — `createStore(initial, builder, options?)`. `builder(api)` returns your methods (merged flat at the root, `store.load()`). The built-in mutators are **not** on the instance — reach them through `api`. Want `reset` on the instance? Define one: `reset() { api.reset(); }`.

There are **no reserved keys** — the store contract (`subscribe`/`getSnapshot`) simply wins on the rare name clash.

## Primitives

| Export                                     | Purpose                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `createStore(initial, builder?, options?)` | The store. `api` = `{ get, set, reset, getContext }`. `options` = `{ equals? }`, plus `context?` on the domain form.                         |
| `useStore(store, selector? \| options?)`   | React hook via `useSyncExternalStore`. Overloads: whole snapshot, or a slice via selector / `{ select, equals }`. **Read-only** — see below. |
| `createStoreContext(factory, options?)`    | Scopes a store to a React subtree: `{ Provider, useStoreContext, useSnapshot }`.                                                             |
| `watch(store, select, cb, options?)`       | Observe outside React; `cb(next, prev)` on slice change → unsubscribe. Zero React imports.                                                   |
| `shallowEqual`                             | In-house shallow equality (objects, arrays, Maps, Sets — one level deep).                                                                    |

**Not in this module, and not in the library:** async coordination (`asyncIdle`/`asyncPending`/`asyncFulfilled`/`asyncRejected`/`runAsync`, `safeAwait`, `createMutex`, `createSingleFlight`) is user-land, and lives in `playground/src/shared/lib/` as reference code to copy. `normalizeError` stays in [`src/utils/`](../utils/) and ships from the root, because the library itself needs it.

## Mutation — `set` / `reset` (no draft engine)

The store ships two mutators; both accept a value or a function:

```ts
store.set({ count: 5 });
store.set((prev) => ({ ...prev, count: prev.count + 1 }));
store.reset(); // back to the initial baseline
```

There is **no `update(draft => …)`** — the store carries no draft/immutability engine, keeping it dependency-free. For ergonomic **nested** updates, compose any immutable-update helper at the call site — bring your own immer:

```ts
import { produce } from 'immer';
store.set((s) =>
  produce(s, (d) => {
    d.a.b.c = 1;
  })
);
```

The playground demonstrates this with a `createImmerStore` helper (`playground/src/shared/lib/immer-store.ts`) that adds a draft-style `update` to the builder api in ~10 lines — immer stays a **playground devDependency** and never enters the shipped bundle.

## Nothing writes during render

`useStore` only reads. Context — the store's dependency injection — is supplied where the store
is **built** (`createStore(initial, builder, { context })`) or by scoping the store to a subtree
with `createStoreContext`; both are pure. Nothing on the instance can change it afterwards.

There is deliberately no way to inject context _from a component_. That would be a mutation of
shared state in a phase React may run twice, discard, or interleave — and with two components
injecting different values it is last-render-wins. The absence of the option is what enforces
it: nothing in the library writes to a store during render, and nothing can be made to.

## Derived / computed state

Derived state is a selector: `useStore(store, s => derive(s))`. Multiple sources: read each with `useStore` and compute inline (React Compiler memoizes). For non-React projection, subscribe with `watch`.

## Conventions

- Snapshots are POJOs. Non-snapshot mutable state (pending resolvers, RAF ids, the current `onClose`) lives as closure variables inside the `builder`.
- `set`/`reset` skip notification when the result is `Object.is`-equal (or per `options.equals`). Return the same reference from a `set(fn)` updater to make a no-op free.
- Tests: pure utilities have unit tests in `__tests__/*.test.ts`; the React hooks (`useStore`, `createStoreContext`) have dedicated `__tests__/*.ct.tsx` component tests with `*.story.tsx` harnesses (registered on the playground Stories page).
