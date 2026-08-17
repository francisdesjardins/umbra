// ── Store module (barrel) ─────────────────────────────────────────────────────
//
// The library's state layer — a hand-rolled reactive cell with zero runtime dependencies. This
// barrel is the ONLY place the rest of the codebase imports store primitives from, and the single
// swap point if the engine is replaced. Scope is the cell and nothing over it: `useStore`,
// `createStoreContext`, `watch` and `shallowEqual` are conveniences the library never uses itself,
// so they live in the playground as reference code to copy, the same deal as the modal templates.
// See `src/store/CLAUDE.md`.

export { createStore } from './create-store.js';
export type {
  CreateDomainStoreOptions,
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './create-store.js';
