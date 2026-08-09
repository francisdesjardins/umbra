import {
  For,
  createComponent,
  createContext,
  createMemo,
  createSignal,
  useContext,
} from 'solid-js';
import type { JSX } from 'solid-js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('outlet');

type ModalOutletContextValue = {
  readonly register: (id: string, node: JSX.Element) => void;
  readonly unregister: (id: string) => void;
};

const ModalOutletContext = createContext<ModalOutletContextValue | null>(null);

/**
 * Read the nearest outlet context. Returns `null` when no `ModalOutlet` wraps the caller — in
 * that case `useModal` returns the dialog via `Modal` as usual.
 *
 * @internal Not part of the public API.
 */
export function useModalOutletContext(): ModalOutletContextValue | null {
  return useContext(ModalOutletContext);
}

/**
 * Scoped outlet that automatically renders modals from descendant `useModal` calls.
 *
 * Same contract as React's: when an outlet wraps a subtree, every `useModal` inside it registers
 * its dialog here instead of returning it via `Modal`, which becomes `null`. Outlets nest; the
 * nearest one wins.
 *
 * **It costs less here, and the reason is instructive.** React's outlet has to move a rendered
 * *node* through state, because a React element only exists while some component returns it — so
 * registration happens in an effect and every descendant re-render republishes. A Solid modal
 * owns a real DOM element from the moment it is created, so registration is a plain call during
 * setup and nothing re-runs when the modal's contents change. The outlet re-renders only when a
 * modal is added or removed.
 *
 * Usage is React's, unchanged — wrap a subtree (`<ModalOutlet><Dashboard /></ModalOutlet>`) and
 * stop placing `modal.Modal`. There is deliberately no `@example` here: this file's examples are
 * type-checked by a harness that compiles JSX as React's, and an imported *Solid* component
 * inside JSX cannot pass it. An example that could not be checked would be worth less than this
 * sentence; the checked one is on `umbra/react`'s `ModalOutlet`.
 */
export function ModalOutlet(props: { readonly children: JSX.Element }): JSX.Element {
  const [modals, setModals] = createSignal<ReadonlyMap<string, JSX.Element>>(new Map());

  const context: ModalOutletContextValue = {
    register(id, node) {
      setModals((current) => {
        if (current.has(id)) {
          return current;
        }
        log('Registering modal', { id });
        return new Map(current).set(id, node);
      });
    },
    unregister(id) {
      setModals((current) => {
        if (!current.has(id)) {
          return current;
        }
        log('Unregistering modal', { id });
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    },
  };

  // The node references are stable for the life of a modal, so `For` reuses each row and only
  // does work when one is added or removed.
  const nodes = createMemo(() => {
    return [...modals().values()];
  });

  return createComponent(ModalOutletContext.Provider, {
    value: context,
    get children(): JSX.Element {
      // The children first, so descendants have registered by the time the list below is read;
      // then the registered dialogs.
      return [
        props.children,
        createComponent(For, {
          get each() {
            return nodes();
          },
          children: (node: JSX.Element) => {
            return node;
          },
        }),
      ];
    },
  });
}
