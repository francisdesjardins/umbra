import { createStore } from 'umbra/react';
import { createStoreContext } from '../create-store-context';

// The factory runs once per Provider mount, so each Provider owns an isolated store instance.
const CounterCtx = createStoreContext(
  () => {
    return createStore(
      { count: 0 },
      {
        builder: ({ set }) => {
          return {
            increment() {
              set((s) => {
                return { ...s, count: s.count + 1 };
              });
            },
          };
        },
      }
    );
  },
  { name: 'StoryCounter' }
);

function Display({ testId }: { readonly testId: string }) {
  const count = CounterCtx.useSnapshot((s) => {
    return s.count;
  });
  return <output data-testid={testId}>{count}</output>;
}

function IncrementButton({ label }: { readonly label: string }) {
  const store = CounterCtx.useStoreContext();
  return (
    <button
      type="button"
      onClick={() => {
        store.increment();
      }}
    >
      {label}
    </button>
  );
}

/** Two consumers under one Provider share state; a second Provider is a fully isolated instance. */
export function StoreContextHarness() {
  return (
    <div>
      <CounterCtx.Provider>
        <Display testId="a-first" />
        <Display testId="a-second" />
        <IncrementButton label="Increment A" />
      </CounterCtx.Provider>

      <CounterCtx.Provider>
        <Display testId="b-count" />
        <IncrementButton label="Increment B" />
      </CounterCtx.Provider>
    </div>
  );
}
