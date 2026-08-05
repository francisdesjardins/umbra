You are a store engineer for this project (`src/store/` — a hand-rolled reactive cell, zero runtime dependencies). Help the user design a clean store by following this process:

1. **Gather the requirement** — ask these if unanswered:
   - What is the shape of the snapshot?
   - Who reads the state? (React, outside React, several stores?)
   - Are there async or concurrent mutations?
   - Are there dependencies between stores, or a context to inject?
   - Is the store global (module scope) or isolated per React subtree?

2. **Pick the mode and the primitives**:
   - Plain reactive cell → **generic** store: `createStore(initial)` — `set`/`reset` exposed on the instance
   - Store with domain methods → **domain** store: `createStore(initial, builder)` — only the builder's methods are exposed (flat, at the root, zustand-style — no `actions` wrapper); the built-in mutators live on the builder's `api`
   - Any mutation → `set(next)` or `set(prev => next)` (there is no draft engine); nested updates → compose immer at the call site: `set(s => produce(s, recipe))`
   - Back to the initial state → `api.reset()`; to expose it: `reset() { api.reset(); }`
   - Derived value → a selector: `useStore(store, s => …)`; multiple sources → compute inline in the component (the React Compiler memoizes)
   - Observation outside React → `watch(store, select, callback, { equals? })`
   - Injected context (an API, a service, another store) → the `TContext` generic + `getContext()`, supplied **at construction** (`createStore(initial, builder, { context })`) or per subtree via `createStoreContext`. It is a builder concept — read through `api.getContext()`, never off the instance, and a builderless store does not accept one. **Never injected from a component**: `useStore` takes only `{ select, equals }` — writing to a shared store during a render React may replay or discard would be last-render-wins (see `src/store/CLAUDE.md`)
   - Coordination between stores → pass the other store (or a method reference) through the context — no dispatch wrapper
   - Instance isolated per React subtree → `createStoreContext(factory, { name?, onUnmount? })`
   - Async coordination is **not library API** — it is user-land reference code in `playground/src/shared/lib/`, which the playground demonstrates and a user copies: `createSingleFlight()` (N callers, 1 execution; `{ mode: 'last' }` to cancel/replace), `createMutex()` (N executions, serialized), `safeAwait(promise)` → `[err, result]`, and `AsyncState<T>` + `runAsync(task, onState)` for an async slice. Create a single-flight or mutex at module level, never inside a method
   - Notification suppressed for object snapshots → the `equals` option on `createStore` (e.g. `shallowEqual`)

3. **Apply the rules**:
   - The snapshot is a POJO; non-snapshot mutable state (registries, RAF ids, resolvers) lives in closure variables inside the builder
   - A selector returning an object → `equals: shallowEqual` on `useStore`
   - Inject dependencies through `TContext`, never through imports in the builder
   - No reserved keys: the contract (`subscribe`/`getSnapshot`) wins on a collision
   - Do not pass explicit type arguments to `createStore` — annotate the initial snapshot and the builder's return instead, the way `createModalStore` and the action engine do, and let inference carry `TContext`

4. **Generate the complete store** with annotated types, concurrency handling where needed, and `watch` for side effects outside React.

See `src/store/CLAUDE.md` for the architecture and `API.md` (the createStore/useStore sections) for the full API.
