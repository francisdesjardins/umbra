// ── Store module (barrel) ─────────────────────────────────────────────────────
//
// The ONLY place the rest of the codebase imports store primitives from, and the single swap point
// if the engine is replaced. Scope is the cell and nothing over it: `useStore`,
// `createStoreContext`, `watch` and `shallowEqual` live in the playground as reference code to
// copy. See `src/store/CLAUDE.md`.

export { createStore } from './create-store.js';
export type {
  CreateDomainStoreOptions,
  CreateStoreOptions,
  GenericStore,
  Store,
  StoreApi,
  StoreContract,
} from './create-store.js';
