import { createSignal, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { StoreContract } from '../store/create-store.js';

/**
 * Read any of the library's stores as a Solid signal.
 *
 * `StoreContract` is `{ subscribe, getSnapshot }` — the pair React consumes through
 * `useSyncExternalStore` with no adapter at all. Solid needs one, and this is the whole of it:
 * a signal seeded with the current snapshot and written on every notification, with the
 * unsubscribe tied to the owner that called.
 *
 * `equals: false` because the store already decides what a change is — it skips notifying when
 * the next snapshot is equal — so a second identity check here could only ever swallow a
 * notification the store meant to send.
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
