// ── Store module (barrel) ─────────────────────────────────────────────────────
//
// The library's state layer — a hand-rolled reactive cell with zero runtime
// dependencies. This barrel is the ONLY place the rest of the codebase imports
// store primitives from, and the single swap point if the engine is replaced.
// See `src/store/CLAUDE.md`.
//
// Scope: the reactive cell and its React bindings only. Async coordination is
// user-land and lives in the playground as reference code to copy.

export { createStore } from './create-store.js';
export type {
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './create-store.js';

export { useStore } from './use-store.js';
export type { UseStoreOptions } from './use-store.js';

export { createStoreContext } from './create-store-context.js';
export type { CreateStoreContextOptions, StoreContextResult } from './create-store-context.js';

export { watch } from './watch.js';
export type { WatchOptions } from './watch.js';

export { shallowEqual } from './shallow-equal.js';
