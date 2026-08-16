import { expect, test } from '@playwright/test';
import { createStore } from '../create-store.js';
import type { GenericStore, Store } from '../create-store.js';

test.describe('createStore — generic (no builder)', () => {
  test('exposes set/reset/getSnapshot/subscribe', () => {
    const store = createStore({ count: 0 });
    expect(store.getSnapshot()).toEqual({ count: 0 });

    store.set({ count: 5 });
    expect(store.getSnapshot()).toEqual({ count: 5 });

    store.set((prev) => {
      return { count: prev.count + 1 };
    });
    expect(store.getSnapshot()).toEqual({ count: 6 });
  });

  test('set accepts an updater function', () => {
    const store = createStore({ count: 1 });
    store.set((prev) => {
      return { count: prev.count * 10 };
    });
    expect(store.getSnapshot().count).toBe(10);
  });

  test('notifies subscribers on change, and unsubscribe stops it', () => {
    const store = createStore({ count: 0 });
    let fired = 0;
    const stop = store.subscribe(() => {
      fired++;
    });

    store.set({ count: 1 });
    expect(fired).toBe(1);

    stop();
    store.set({ count: 2 });
    expect(fired).toBe(1);
  });

  test('skips notification when the next snapshot is Object.is-equal', () => {
    const store = createStore({ count: 0 });
    let fired = 0;
    store.subscribe(() => {
      fired++;
    });

    const same = store.getSnapshot();
    store.set(same); // identical reference → no notify
    expect(fired).toBe(0);

    store.set((prev) => {
      return prev;
    }); // updater returns the same reference → no notify
    expect(fired).toBe(0);
  });

  test('honors a custom equals', () => {
    const store = createStore(
      { v: 1 },
      {
        equals: () => {
          return true;
        },
      }
    );
    let fired = 0;
    store.subscribe(() => {
      fired++;
    });
    store.set({ v: 999 });
    expect(fired).toBe(0);
    expect(store.getSnapshot().v).toBe(1);
  });
});

test.describe('createStore — reset', () => {
  test('bare reset() restores the initial baseline', () => {
    const store = createStore({ count: 0 });
    store.set({ count: 9 });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 0 });
  });

  test('reset(newSnapshot) commits and rebaselines', () => {
    const store = createStore({ count: 0 });
    store.reset({ count: 5 });
    expect(store.getSnapshot()).toEqual({ count: 5 });
    store.set({ count: 8 });
    store.reset(); // restores the new baseline
    expect(store.getSnapshot()).toEqual({ count: 5 });
  });

  test('reset(updater) derives the next baseline from the current one', () => {
    const store = createStore({ count: 2 });
    store.reset((initial) => {
      return { count: initial.count + 10 };
    });
    expect(store.getSnapshot()).toEqual({ count: 12 });
    store.set({ count: 0 });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 12 });
  });
});

test.describe('createStore — domain (builder)', () => {
  test('merges methods flat at the root; built-in mutators stay on the api', () => {
    const counter = createStore(
      { count: 0 },
      {
        builder: ({ set, reset }) => {
          return {
            increment() {
              set((s) => {
                return { ...s, count: s.count + 1 };
              });
            },
            clear() {
              reset();
            },
          };
        },
      }
    );

    counter.increment();
    counter.increment();
    expect(counter.getSnapshot().count).toBe(2);

    counter.clear();
    expect(counter.getSnapshot().count).toBe(0);

    // The built-in mutators are NOT exposed on a domain store instance.
    expect((counter as Record<string, unknown>)['set']).toBeUndefined();
    expect((counter as Record<string, unknown>)['reset']).toBeUndefined();
  });

  test('the store contract wins over a same-named method', () => {
    const store = createStore(
      { n: 0 },
      {
        builder: () => {
          return {
            // deliberately shadow a contract key
            getSnapshot: () => {
              return 'nope';
            },
          };
        },
      }
    );
    // built-in getSnapshot survives and returns the real snapshot
    expect(store.getSnapshot()).toEqual({ n: 0 });
  });

  test('injects context read via getContext()', () => {
    type Ctx = { multiplier: number };
    const store = createStore<{ value: number }, { scale: (n: number) => void }, Ctx>(
      { value: 0 },
      {
        builder: ({ set, getContext }) => {
          return {
            scale(n: number) {
              set((s) => {
                return { ...s, value: n * getContext().multiplier };
              });
            },
          };
        },
        context: { multiplier: 3 },
      }
    );

    store.scale(4);
    expect(store.getSnapshot().value).toBe(12);
  });

  test('context is a builder concept — a builderless store does not accept one', () => {
    // Nothing could read it: `getContext` is handed to the builder, and the instance exposes no
    // context accessor. The `@ts-expect-error` is the assertion — an unused directive fails the
    // build, so this stays true only while the option really is rejected.
    // @ts-expect-error a store with no builder has nothing that could read a context
    const store = createStore({ value: 0 }, { context: { multiplier: 3 } });
    expect(store.getSnapshot()).toEqual({ value: 0 });
  });
});

// ── Overload resolution ───────────────────────────────────────────────────────
//
// `createStore` is overloaded on its second parameter, and both forms now take an options
// object: `<TSnapshot, TMethods, TContext>(initial, { builder, … })` and
// `<TSnapshot, TContext>(initial, options?)`. The two differ in type-parameter arity, which
// invites the suspicion that an explicitly-instantiated `createStore<Snap, Methods>(initial, …)`
// matches the *generic* overload by arity and silently binds `TContext = Methods`.
//
// It does not, and these pin why: the **domain overload is declared first and requires
// `builder`**, so a call carrying one matches it before arity is consulted, and a call without
// one fails it and falls through to the generic form. Declaration order is what makes that
// robust rather than a freshness accident — excess-property checking would reject a stray
// `builder` on an object *literal* handed to the generic overload, but not on a variable. The
// assertions are the types themselves — `Equals` fails the build if either overload starts
// capturing a call meant for the other.

/** Compile error unless `A` and `B` are mutually assignable. */
type Equals<A extends B, B extends C, C = A> = A;

type Snap = { count: number };
type Methods = { inc(): void };
type Ctx = { readonly api: string };

const inferredDomain = createStore(
  { count: 0 },
  {
    builder: ({ set }) => {
      return {
        inc() {
          set((s) => {
            return { count: s.count + 1 };
          });
        },
      };
    },
  }
);

const explicitDomain = createStore<Snap, Methods>(
  { count: 0 },
  {
    builder: ({ set }) => {
      return {
        inc() {
          set({ count: 1 });
        },
      };
    },
  }
);

const explicitGeneric = createStore<Snap>({ count: 0 }, { equals: Object.is });

export type _InferredBuilderIsDomain = Equals<typeof inferredDomain, Store<Snap, Methods>>;
export type _ExplicitBuilderIsDomain = Equals<typeof explicitDomain, Store<Snap, Methods>>;
export type _ExplicitOptionsIsGeneric = Equals<typeof explicitGeneric, GenericStore<Snap>>;
export type _BareIsGeneric = Equals<ReturnType<typeof createStore<Snap>>, GenericStore<Snap>>;

// Context reaches the builder's `api` and stays off the returned instance — it is read through
// `getContext()`, never off the store, which is why `Store` carries no context type parameter.
const domainWithContext = createStore<Snap, Methods, Ctx>(
  { count: 0 },
  {
    builder: ({ set, getContext }) => {
      return {
        inc() {
          set({ count: getContext().api.length });
        },
      };
    },
    context: { api: 'xyz' },
  }
);
export type _ContextDoesNotReachTheInstance = Equals<
  typeof domainWithContext,
  Store<Snap, Methods>
>;

test.describe('createStore — overload resolution', () => {
  test('a builder reaches the domain overload however it is instantiated', () => {
    // The assertions are the four type aliases above; these calls prove the resolved types
    // describe the object actually returned, rather than a shape nothing constructs.
    inferredDomain.inc();
    explicitDomain.inc();
    expect(inferredDomain.getSnapshot()).toEqual({ count: 1 });

    explicitGeneric.set({ count: 7 });
    expect(explicitGeneric.getSnapshot()).toEqual({ count: 7 });
  });
});
