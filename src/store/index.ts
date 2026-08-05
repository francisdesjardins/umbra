// ── Store module (barrel) ─────────────────────────────────────────────────────
//
// The library's state layer — a hand-rolled reactive cell with zero runtime
// dependencies. This barrel is the ONLY place the rest of the codebase imports
// store primitives from, and the single swap point if the engine is replaced.
// See `src/store/CLAUDE.md`.
//
// Scope: the reactive cell only. Its React bindings live in `./react`, so that
// this barrel stays importable from the framework-agnostic package root — see
// `./react/index.ts` for why that separation exists. Async coordination is
// user-land and lives in the playground as reference code to copy.

export { createStore } from './create-store.js';
export type {
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './create-store.js';

export { watch } from './watch.js';
export type { WatchOptions } from './watch.js';

export { shallowEqual } from './shallow-equal.js';
