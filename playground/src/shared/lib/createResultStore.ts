import { createStore } from 'umbra/react';

/**
 * A module-level store for a single `result: string | null` — the playground's standard way to show
 * what happened after a dialog closes. Call once at module scope, read with `useStore`.
 *
 * @example
 * const resultStore = createResultStore(); // onClose: (r) => resultStore.setResult(r.reason)
 */
export function createResultStore() {
  const store = createStore(
    { result: null as string | null },
    {
      builder: ({ set }) => {
        return {
          setResult(result: string | null) {
            set({ result });
          },
        };
      },
    }
  );
  return store;
}
