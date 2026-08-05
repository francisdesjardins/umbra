import { createStore, type CreateStoreOptions, type Store, type StoreApi } from 'umbra/react';
import { produce, type Draft } from 'immer';

// ── createImmerStore ──────────────────────────────────────────────────────────
//
// The library's `createStore` is dependency-free and offers `set`/`reset`. This
// playground helper shows the "bring your own immer" pattern: it extends the
// builder API with a draft-mutation `update`, implemented in one line as
// `set((s) => produce(s, recipe))`. immer stays a playground devDependency and
// never enters the shipped library bundle.

/** Builder API extended with an immer-backed `update`. */
export type ImmerStoreApi<TSnapshot, TContext = never> = StoreApi<TSnapshot, TContext> & {
  /** Draft mutation via immer — `update((d) => { d.a.b = 1 })`. */
  readonly update: (recipe: (draft: Draft<TSnapshot>) => void) => void;
};

/**
 * Like `createStore(initial, builder, options)`, but the builder receives an
 * extra `update(recipe)` that mutates an immer draft.
 */
export function createImmerStore<
  TSnapshot,
  TMethods extends Record<string, unknown>,
  TContext = never,
>(
  initialSnapshot: TSnapshot,
  builder: (api: ImmerStoreApi<TSnapshot, TContext>) => TMethods,
  options?: CreateStoreOptions<TSnapshot, TContext>
): Store<TSnapshot, TMethods> {
  return createStore<TSnapshot, TMethods, TContext>(
    initialSnapshot,
    (api) => {
      return builder({
        ...api,
        update: (recipe) => {
          api.set((s) => {
            return produce(s, recipe);
          });
        },
      });
    },
    options
  );
}
