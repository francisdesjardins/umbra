import { useState } from 'react';
import { createStore, shallowEqual } from '../../index.js';
import { useStore } from '../index.js';

// ── Store ───────────────────────────────────────────────────────────────────
// Factory (not module scope) so every mounted harness gets a fresh store —
// component tests stay isolated without cross-test state bleed.

function createCounterStore() {
  return createStore({ count: 0, label: 'idle', other: 0 }, ({ set }) => {
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
  });
}

/**
 * Tests the three useStore overloads: whole snapshot, selector slice, and
 * options form with `shallowEqual` for an object-returning selector.
 */
export function UseStoreHarness() {
  const [store] = useState(createCounterStore);

  // Whole snapshot — re-renders on any change
  const snap = useStore(store);

  // Selector — referentially stable slice
  const count = useStore(store, (s) => {
    return s.count;
  });

  // Options form — object-returning selector guarded by shallowEqual
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
