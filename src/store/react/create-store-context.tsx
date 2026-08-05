import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import type { StoreContract } from '../create-store.js';
import { useStore } from './use-store.js';

// ── createStoreContext ────────────────────────────────────────────────────────

type SnapshotOf<TStore> = TStore extends StoreContract<infer S> ? S : never;

/** Options for {@link createStoreContext}. */
export type CreateStoreContextOptions<TStore> = {
  /** Used in the provider's display name and in error messages. */
  readonly name?: string | undefined;
  /** Called with the store instance when a provider unmounts. */
  readonly onUnmount?: ((store: TStore) => void) | undefined;
};

/** What {@link createStoreContext} returns. */
export type StoreContextResult<TSnapshot, TStore extends StoreContract<unknown>> = {
  /** Builds one store per mount and scopes it to the subtree. */
  readonly Provider: (props: { readonly children: ReactNode }) => ReactNode;
  /** The store instance from the nearest provider (full method surface). */
  readonly useStoreContext: () => TStore;
  /** Subscribe to the provider's store — whole snapshot, or a selected slice. */
  readonly useSnapshot: <TSlice = TSnapshot>(
    selector?: (snapshot: TSnapshot) => TSlice,
    equals?: (a: TSlice, b: TSlice) => boolean
  ) => TSlice;
};

/**
 * Scopes a store to a React subtree. `factory` builds a fresh store per provider
 * mount; descendants read it via `useStoreContext()` (full store) or
 * `useSnapshot()` (reactive snapshot / slice).
 *
 * @example
 * const Wizard = createStoreContext(() =>
 *   createStore({ step: 0 }, ({ set }) => ({
 *     next() {
 *       set((s) => ({ step: s.step + 1 }));
 *     },
 *   }))
 * );
 *
 * // Each <Wizard.Provider> subtree gets its own store.
 * <Wizard.Provider>
 *   <Steps />
 * </Wizard.Provider>;
 *
 * // Inside: the instance, or a reactive slice of it.
 * const wizard = Wizard.useStoreContext();
 * const step = Wizard.useSnapshot((s) => s.step);
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
    // The snapshot type is erased to `unknown` behind the TStore constraint;
    // re-narrow it to the concrete snapshot so the selector is typed.
    const store = useStoreContext() as StoreContract<SnapshotOf<TStore>>;
    return useStore(store, { select: selector, equals });
  }

  return { Provider, useStoreContext, useSnapshot };
}
