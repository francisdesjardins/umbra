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

type DialogOutletContextValue = {
  readonly register: (id: string, node: JSX.Element) => void;
  readonly unregister: (id: string) => void;
};

const DialogOutletContext = createContext<DialogOutletContextValue | null>(null);

/**
 * The nearest outlet context, or `null` when none wraps the caller.
 *
 * @internal Not part of the public API.
 */
export function useDialogOutletContext(): DialogOutletContextValue | null {
  return useContext(DialogOutletContext);
}

/**
 * `umbra/react`'s `DialogOutlet`, contract unchanged, and cheaper: React must move a rendered
 * *node* through state, so registration is an effect and every descendant re-render republishes,
 * while a Solid dialog owns a real DOM element from creation — registration is a plain setup call
 * and the outlet re-renders only when a dialog is added or removed.
 *
 * No `@example` deliberately — the harness type-checks examples as React JSX, which an imported
 * Solid component inside JSX cannot pass; the checked one is on `umbra/react`'s `DialogOutlet`.
 */
export function DialogOutlet(props: { readonly children: JSX.Element }): JSX.Element {
  const [dialogs, setDialogs] = createSignal<ReadonlyMap<string, JSX.Element>>(new Map());

  const context: DialogOutletContextValue = {
    register(id, node) {
      setDialogs((current) => {
        if (current.has(id)) {
          return current;
        }
        log('Registering dialog', { id });
        return new Map(current).set(id, node);
      });
    },
    unregister(id) {
      setDialogs((current) => {
        if (!current.has(id)) {
          return current;
        }
        log('Unregistering dialog', { id });
        const next = new Map(current);
        next.delete(id);
        return next;
      });
    },
  };

  // Node references are stable for a dialog's life, so `For` reuses each row and works only when
  // one is added or removed.
  const nodes = createMemo(() => {
    return [...dialogs().values()];
  });

  return createComponent(DialogOutletContext.Provider, {
    value: context,
    get children(): JSX.Element {
      // Children first, so descendants have registered by the time the list below is read.
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
