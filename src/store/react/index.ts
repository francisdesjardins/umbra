// ── Store module — React bindings ─────────────────────────────────────────────
//
// The engine's React half, kept in its own directory for one reason: everything
// under `src/store/` except this folder is framework-free, and the package root
// must resolve with React absent. When the bindings sat beside the engine, the
// main barrel re-exported them, so any core module importing that barrel pulled
// React into the root's import graph — and the React-free property survived only
// because Rollup tree-shook the re-exports back out.
//
// Splitting them makes `../index.js` safe for every core module to import, which
// is why there is no longer an exception to the barrel rule.

export { useStore } from './use-store.js';
export type { UseStoreOptions } from './use-store.js';

export { createStoreContext } from './create-store-context.js';
export type { CreateStoreContextOptions, StoreContextResult } from './create-store-context.js';
