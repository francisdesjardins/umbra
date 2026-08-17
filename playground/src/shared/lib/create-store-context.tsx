import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { StoreContract } from 'umbra/react';
import { useStore } from './use-store.js';

type SnapshotOf<TStore> = TStore extends StoreContract<infer S> ? S : never;

export type CreateStoreContextOptions<TStore> = {
  /** Used in the provider's display name and in error messages. */
  readonly name?: string | undefined;
  /** Called with the store instance when a provider unmounts. */
  readonly onUnmount?: ((store: TStore) => void) | undefined;
};

export type StoreContextResult<TSnapshot, TStore extends StoreContract<unknown>> = {
  readonly Provider: (props: { readonly children: ReactNode }) => ReactNode;
  readonly useStoreContext: () => TStore;
  /** Subscribe to that store — whole snapshot, or a selected slice. */
  readonly useSnapshot: <TSlice = TSnapshot>(
    selector?: (snapshot: TSnapshot) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ) => TSlice;
};

/**
 * Scopes a store to a React subtree. `factory` builds a fresh store per provider mount;
 * descendants read it via `useStoreContext()` (full store) or `useSnapshot()` (reactive slice).
 *
 * @example
 * const Wizard = createStoreContext(() => createStore({ step: 0 }));
 * const step = Wizard.useSnapshot((s) => s.step); // inside a <Wizard.Provider>
 */
export function createStoreContext<TStore extends StoreContract<unknown>>(
  factory: () => TStore,
  options?: CreateStoreContextOptions<TStore>
): StoreContextResult<SnapshotOf<TStore>, TStore> {
  const name = options?.name ?? 'StoreContext';
  const onUnmount = options?.onUnmount ?? null;
  const Context = createContext<TStore | null>(null);

  function Provider({ children }: { readonly children: ReactNode }): ReactNode {
    const [store] = useState(factory);
    useEffect(() => {
      if (onUnmount === null) {
        return;
      }
      return () => {
        onUnmount(store);
      };
    }, [store]);
    return <Context value={store}>{children}</Context>;
  }
  Provider.displayName = `${name}.Provider`;

  function useStoreContext(): TStore {
    const store = use(Context);
    if (store === null) {
      throw new Error(`[${name}] useStoreContext must be called inside <${name}.Provider>.`);
    }
    return store;
  }

  function useSnapshot<TSlice = SnapshotOf<TStore>>(
    selector?: (snapshot: SnapshotOf<TStore>) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ): TSlice {
    // The snapshot type is erased to `unknown` behind the TStore constraint; re-narrow it.
    const store = useStoreContext() as StoreContract<SnapshotOf<TStore>>;
    return useStore(store, { select: selector, equals });
  }

  return { Provider, useStoreContext, useSnapshot };
}
