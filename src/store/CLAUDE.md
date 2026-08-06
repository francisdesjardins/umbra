# Store Module — State Layer

The library's reactive state layer. **A hand-rolled reactive cell with zero runtime dependencies** — the cell and shallow equality are both in-house.

## The swap rule

This folder is the **single swap point** for the state manager. Nothing outside `src/store/` reaches into its internals — the rest of the codebase imports store primitives from `src/store/` (internally) or from the package root (playground). To change the engine, reimplement these files; consumers don't change.

**The module is the engine and nothing over it**, and it is framework-free: `createStore` and `StoreContract` ship from the package root, which must resolve with React absent. There is no React binding here to keep out of that import graph — a store's public shape is a subscribe + getter pair, which is exactly what `useSyncExternalStore` consumes, so a React caller needs no adapter and a future binding needs nothing new here.

## Why a store module at all

The whole thing is small (a `Set` of listeners + `get`/`set`), but the module still earns its place:

- **POJO snapshots** — methods live beside the state (in the builder), never inside it, so `getSnapshot()` is clone/serialize-safe and selector-stable.
- **One flat API** — `set(next | (prev) => next)`, `reset()`, and context injection folded into a zustand-style flat store.
- **`useSyncExternalStore` contract** — every store satisfies `{ subscribe, getSnapshot }`, so the modal store, the action engine, the manager and any reader compose over one shape.

## Two store modes

- **Generic** — `createStore(initial, options?)`, no builder. The built-in mutators (`set`, `reset`) are exposed on the instance. Use for a plain reactive cell.
- **Domain** — `createStore(initial, builder, options?)`. `builder(api)` returns your methods (merged flat at the root, `store.load()`). The built-in mutators are **not** on the instance — reach them through `api`. Want `reset` on the instance? Define one: `reset() { api.reset(); }`.

There are **no reserved keys** — the store contract (`subscribe`/`getSnapshot`) simply wins on the rare name clash.

## What ships, and what does not

`createStore` and `StoreContract` are exported, on one rule: **export what the library runs on
and would otherwise be duplicated; do not export what it does not use.** The modal store, the
action engine, the outlet and the manager are all built on `createStore`, so it stays in `src/`
regardless — keeping it private would only force a second copy into the playground.
`StoreContract` comes with it as the `{ subscribe, getSnapshot }` pair every store satisfies.

Note what this is _not_ justified by. A second binding would live in this repo beside
`src/react.ts` and import internals (`createModalStore`, `finalizeModalClose`) directly, none of
which are exported — so "an external binding author needs it" is not the reason, and a Solid
binding would reach for signals over this cell anyway.

Everything built _over_ the engine is not exported. `useStore`, `createStoreContext`, `watch`
and `shallowEqual` had no caller inside the library, and a dialog manager is not where anyone
looks for state management — least of all when the same author ships `stardust` for exactly
that. They live in `playground/src/shared/lib/` as reference code to copy, on the same terms as
the modal templates. A consumer needs none of them to read a store: `StoreContract` is precisely
what `useSyncExternalStore` takes.

## Primitives

| Export                                     | Purpose                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `createStore(initial, builder?, options?)` | The store. `api` = `{ get, set, reset, getContext }`. `options` = `{ equals? }`, plus `context?` on the domain form. |
| `StoreContract<TSnapshot>`                 | The `{ subscribe, getSnapshot }` pair every store satisfies — what a reader binds to.                                |

Plus the shapes that go with them: `Store`, `GenericStore`, `StoreApi`, `CreateStoreOptions`.
That is the whole module — the two files in this folder are `create-store.ts` and the barrel.

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

Reading a store is a subscription, never a write. Context — the store's dependency injection — is
supplied where the store is **built** (`createStore(initial, builder, { context })`), which is
pure. Nothing on the instance can change it afterwards.

There is deliberately no way to inject context _from a component_. That would be a mutation of
shared state in a phase React may run twice, discard, or interleave — and with two components
injecting different values it is last-render-wins. The absence of the option is what enforces
it: nothing in the library writes to a store during render, and nothing can be made to.

## Derived / computed state

Derived state is computed at the read: `useSyncExternalStore(store.subscribe, () => derive(store.getSnapshot()))`, or inline in the component (the React Compiler memoizes). Multiple sources: read each and compute inline. Outside React, derive inside a `subscribe` callback. There is no `createDerivedStore`, and the selector/`watch` conveniences that used to live here are playground reference code now — see `playground/src/shared/lib/`.

## Conventions

- Snapshots are POJOs. Non-snapshot mutable state (pending resolvers, RAF ids, the current `onClose`) lives as closure variables inside the `builder`.
- `set`/`reset` skip notification when the result is `Object.is`-equal (or per `options.equals`). Return the same reference from a `set(fn)` updater to make a no-op free.
- Tests: the engine is pure, so it is unit-tested in `__tests__/*.test.ts` — including the overload assertions in `create-store.test.ts`, which pin how an explicit `createStore<Snap, Methods>(…)` resolves rather than leaving it to be rediscovered.
