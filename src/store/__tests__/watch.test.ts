import { expect, test } from '@playwright/test';
import { createStore } from '../create-store.js';
import { watch } from '../watch.js';

test.describe('watch', () => {
  test('fires callback(next, prev) when the selected slice changes', () => {
    const store = createStore({ count: 0, other: 'x' });
    const calls: Array<[number, number]> = [];

    watch(
      store,
      (s) => {
        return s.count;
      },
      (next, prev) => {
        return calls.push([next, prev]);
      }
    );

    store.set({ count: 1, other: 'x' });
    store.set({ count: 2, other: 'x' });

    expect(calls).toEqual([
      [1, 0],
      [2, 1],
    ]);
  });

  test('does not fire when the selected slice is unchanged', () => {
    const store = createStore({ count: 0, other: 'x' });
    let fired = 0;

    watch(
      store,
      (s) => {
        return s.count;
      },
      () => {
        fired++;
      }
    );

    store.set({ count: 0, other: 'y' }); // only `other` changed
    expect(fired).toBe(0);
  });

  test('unsubscribe stops further callbacks', () => {
    const store = createStore({ count: 0 });
    let fired = 0;

    const stop = watch(
      store,
      (s) => {
        return s.count;
      },
      () => {
        fired++;
      }
    );

    store.set({ count: 1 });
    stop();
    store.set({ count: 2 });
    expect(fired).toBe(1);
  });

  test('honors a custom equals', () => {
    const store = createStore({ point: { x: 0, y: 0 } });
    const calls: number[] = [];

    watch(
      store,
      (s) => {
        return s.point;
      },
      (next) => {
        return calls.push(next.x);
      },
      {
        equals: (a, b) => {
          return a.x === b.x;
        },
      } // ignore y
    );

    store.set({ point: { x: 0, y: 9 } }); // x unchanged → no fire
    store.set({ point: { x: 1, y: 9 } }); // x changed → fire
    expect(calls).toEqual([1]);
  });
});
