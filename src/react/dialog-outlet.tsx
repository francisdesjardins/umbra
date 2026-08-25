import { createStore } from '../store/index.js';
import {
  Fragment,
  createContext,
  use,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { createLogger } from '../utils/logger.js';

const log = createLogger('outlet');

type DialogOutletContextValue = {
  readonly register: (id: string, node: ReactNode) => void;
  readonly unregister: (id: string) => void;
};

const DialogOutletContext = createContext<DialogOutletContextValue | null>(null);

/**
 * The nearest outlet context, or `null` when none wraps the caller — then `useDialog` returns the
 * dialog via `Dialog` as usual.
 *
 * @internal Not part of the public API.
 */
export function useDialogOutletContext(): DialogOutletContextValue | null {
  return use(DialogOutletContext);
}

// The outlet holds rendered *nodes* rather than a DOM anchor to portal into, because a React
// element only renders while some component returns it and the consumer must never write
// `{Dialog}`. Two inherent costs: registration is an effect (mutating an external store during
// render breaks concurrent rendering), so content lands one commit behind its owner — not a visible
// frame, see the paint-timing note in `use-dialog.tsx` — and every descendant render republishes,
// re-rendering the outlet cheaply (`children` is unchanged, so React bails out). Two redesigns
// rejected: a portal-anchor outlet removes both but reintroduces `{Dialog}`; a per-dialog host
// component would confine the second, for no measurable win.

type OutletSnapshot = {
  readonly modals: ReadonlyMap<string, ReactNode>;
};

function createOutletStore() {
  // Annotated, not type arguments — two of those match `createStore`'s generic overload by arity.
  const initial: OutletSnapshot = { modals: new Map() };

  return createStore(initial, {
    builder: ({ set }): OutletStoreMethods => {
      const modals = new Map<string, ReactNode>();

      return {
        register(id: string, node: ReactNode): void {
          const isNew = !modals.has(id);
          if (isNew) {
            log('Registering modal', { id });
          }
          modals.set(id, node);
          set({ modals: new Map(modals) });
        },

        unregister(id: string): void {
          if (modals.delete(id)) {
            log('Unregistering modal', { id });
            set({ modals: new Map(modals) });
          }
        },
      };
    },
  });
}

type OutletStoreMethods = {
  register(id: string, node: ReactNode): void;
  unregister(id: string): void;
};

/**
 * Scoped outlet that renders the dialogs of every descendant `useDialog` call, so nothing has to
 * place `{modal.Dialog}` in JSX. Inside one a modal registers here instead and its `Dialog` becomes
 * `null` — destructuring still works, it renders nothing. Outlets nest: the nearest wins.
 * @example
 * ```tsx
 * function App() {
 *   // Dialogs opened anywhere below render here.
 *   return (
 *     <DialogOutlet>
 *       <Dashboard />
 *     </DialogOutlet>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { open } = useDialog({ id: 'info', render: () => <div>Hello</div> });
 *   // No need to render `Dialog` — the outlet handles it.
 *   return (
 *     <button
 *       onClick={() => {
 *         void open();
 *       }}
 *     >
 *       Open
 *     </button>
 *   );
 * }
 * ```
 */
export function DialogOutlet({ children }: { readonly children: ReactNode }) {
  // Created once with the store so its identity is stable: a fresh context object per render would
  // re-render every descendant `useDialog`, which re-registers, which is a loop.
  const [init] = useState(() => {
    const store = createOutletStore();
    const ctx: DialogOutletContextValue = {
      register: (id, node) => {
        store.register(id, node);
      },
      unregister: (id) => {
        store.unregister(id);
      },
    };
    return { store, ctx };
  });

  // Server-readable for the reason on `useDialog`: the outlet's store is built above and holds no DOM.
  const snap = useSyncExternalStore(
    init.store.subscribe,
    init.store.getSnapshot,
    init.store.getSnapshot
  );

  return (
    <DialogOutletContext value={init.ctx}>
      {children}
      {Array.from(snap.modals.entries(), ([id, node]) => {
        return <Fragment key={id}>{node}</Fragment>;
      })}
    </DialogOutletContext>
  );
}
