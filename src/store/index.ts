// ── Store module (barrel) ─────────────────────────────────────────────────────
//
// The library's state layer — a hand-rolled reactive cell with zero runtime
// dependencies. This barrel is the ONLY place the rest of the codebase imports
// store primitives from, and the single swap point if the engine is replaced.
// See `src/store/CLAUDE.md`.
//
// Scope: the reactive cell, and nothing over it. `useStore`, `createStoreContext`,
// `watch` and `shallowEqual` were conveniences the library never used itself, so
// they live in the playground as reference code to copy — the same deal as the
// modal templates. What ships is the engine a binding may need.

export { createStore } from './create-store.js';
export type {
  CreateDomainStoreOptions,
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './create-store.js';
