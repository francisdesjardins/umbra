import { useState } from 'react';
import { createStore } from 'umbra/react';
import { shallowEqual } from '../shallow-equal';
import { useStore } from '../use-store';

// Factory, not module scope, so every mounted harness gets a fresh store and tests stay isolated.
function createCounterStore() {
  return createStore(
    { count: 0, label: 'idle', other: 0 },
    {
      builder: ({ set }) => {
        return {
          increment() {
            set((s) => {
              return { ...s, count: s.count + 1 };
            });
          },
          setLabel(label: string) {
            set((s) => {
              return { ...s, label };
            });
          },
          bumpOther() {
            set((s) => {
              return { ...s, other: s.other + 1 };
            });
          },
        };
      },
    }
  );
}

/** The three `useStore` overloads: whole snapshot, selector slice, options + `shallowEqual`. */
export function UseStoreHarness() {
  const [store] = useState(createCounterStore);

  const snap = useStore(store);

  const count = useStore(store, (s) => {
    return s.count;
  });

  const pair = useStore(store, {
    select: (s) => {
      return { count: s.count, label: s.label };
    },
    equals: shallowEqual,
  });

  return (
    <div>
      <output data-testid="whole-count">{snap.count}</output>
      <output data-testid="selected-count">{count}</output>
      <output data-testid="pair">{`${String(pair.count)}:${pair.label}`}</output>
      <output data-testid="other">{snap.other}</output>

      <button
        type="button"
        onClick={() => {
          store.increment();
        }}
      >
        Increment
      </button>
      <button
        type="button"
        onClick={() => {
          store.setLabel('busy');
        }}
      >
        Set Label
      </button>
      <button
        type="button"
        onClick={() => {
          store.bumpOther();
        }}
      >
        Bump Other
      </button>
    </div>
  );
}
