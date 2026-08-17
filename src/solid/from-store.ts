import { createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { StoreContract } from '../store/create-store.js';

/**
 * Read any of the library's stores as a Solid signal — the adapter React does not need for the
 * same `{ subscribe, getSnapshot }` pair: a signal seeded with the current snapshot, written on
 * every notification, unsubscribed with the calling owner. `equals: false` because the store
 * already decides what a change is, so a second identity check could only swallow one.
 *
 * @example
 * const counter = createStore({ count: 0 });
 * const snapshot = fromStore(counter);
 * createEffect(() => {
 *   console.log(snapshot().count);
 * });
 */
export function fromStore<TSnapshot>(source: StoreContract<TSnapshot>): Accessor<TSnapshot> {
  const [snapshot, setSnapshot] = createSignal(source.getSnapshot(), { equals: false });

  onCleanup(
    source.subscribe(() => {
      setSnapshot(() => {
        return source.getSnapshot();
      });
    })
  );

  return snapshot;
}
