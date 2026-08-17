import { createStore, type CreateStoreOptions, type Store, type StoreApi } from 'umbra/react';
import { produce, type Draft } from 'immer';

// The "bring your own immer" pattern: the library's `createStore` offers only `set`/`reset`, and
// this adds a draft-mutation `update`. immer stays a playground devDependency, never in the bundle.

/** Builder API extended with an immer-backed `update`. */
export type ImmerStoreApi<TSnapshot, TContext = never> = StoreApi<TSnapshot, TContext> & {
  /** Draft mutation via immer — `update((d) => { d.a.b = 1 })`. */
  readonly update: (recipe: (draft: Draft<TSnapshot>) => void) => void;
};

/** Like `createStore(initial, { builder })`, but the builder also gets `update(recipe)`. */
export function createImmerStore<
  TSnapshot,
  TMethods extends Record<string, unknown>,
  TContext = never,
>(
  initialSnapshot: TSnapshot,
  options: CreateStoreOptions<TSnapshot, TContext> & {
    readonly builder: (api: ImmerStoreApi<TSnapshot, TContext>) => TMethods;
  }
): Store<TSnapshot, TMethods> {
  const { builder, ...rest } = options;
  return createStore<TSnapshot, TMethods, TContext>(initialSnapshot, {
    ...rest,
    builder: (api) => {
      return builder({
        ...api,
        update: (recipe) => {
          api.set((s) => {
            return produce(s, recipe);
          });
        },
      });
    },
  });
}
