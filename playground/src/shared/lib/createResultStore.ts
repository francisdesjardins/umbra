import { createStore } from 'umbra/react';

/**
 * Creates a module-level store for tracking a single `result: string | null`
 * value — the standard pattern used across playground examples to display what
 * happened after a modal closes.
 *
 * Call once at module scope, use `useStore(resultStore)` in the component.
 *
 * @example
 * const resultStore = createResultStore();
 *
 * export function MyExample() {
 *   const { result } = useStore(resultStore);
 *   // ...
 *   // onClose: (r) => { resultStore.setResult(`Closed: ${r.reason}`); }
 * }
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
