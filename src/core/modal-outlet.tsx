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

// ── Outlet Context ──────────────────────────────────────────────────────────

type ModalOutletContextValue = {
  readonly register: (id: string, node: ReactNode) => void;
  readonly unregister: (id: string) => void;
};

const ModalOutletContext = createContext<ModalOutletContextValue | null>(null);

/**
 * Read the nearest outlet context. Returns `null` when no `ModalOutlet`
 * wraps the calling component — in that case `useModal` falls back to
 * returning the dialog via `Modal` as usual.
 *
 * @internal Not part of the public API.
 */
export function useModalOutletContext(): ModalOutletContextValue | null {
  return use(ModalOutletContext);
}

// ── Outlet Store ────────────────────────────────────────────────────────────
//
// Why the outlet holds rendered *nodes* rather than a DOM anchor to portal into:
// the whole point of `ModalOutlet` is that the consumer never writes `{Modal}`. A
// React element only renders if some component returns it, so if the consumer
// returns nothing, the outlet itself has to be that component — which means the
// node has to travel from `useModal` to the outlet through state.
//
// Two costs follow from that and are inherent, not oversights:
//   1. Registration happens in an effect (mutating an external store during render
//      would break concurrent rendering), so outlet-rendered content reaches the DOM
//      one commit behind the owning component. Measured, this is NOT a visible frame:
//      React flushes the passive effect and the outlet's cascading re-render before
//      the next animation frame. Switching the registration to `useLayoutEffect` was
//      tried and changes nothing observable — the DOM still reads the old value at the
//      end of the click's own task, because the outlet's re-render is a cascade rather
//      than part of the same commit. It stays passive so it does not block paint.
//      Bounded by the paint-timing CT test.
//   2. Every render of a descendant `useModal` publishes a fresh node and therefore
//      re-renders the outlet. That re-render is cheap — `children` is an unchanged
//      element so React bails out of it, leaving only the modal fragments to
//      reconcile — but it is not avoidable while nodes travel through state.
//
// Two redesigns were considered:
//   - A portal-anchor outlet (renders a `display: contents` div, `useModal` portals
//     into it) removes both costs, but only by reintroducing the requirement that the
//     consumer render `{Modal}` — the one thing this component exists to avoid.
//   - Registering a *stable entry* per modal and rendering each through its own host
//     component (`useSyncExternalStore` on a per-modal cell) would confine cost 2 to
//     the modal that re-rendered, instead of the whole outlet. That works, but buys an
//     unmeasurable win for an extra component per modal, so it is deliberately not done.

type OutletSnapshot = {
  readonly modals: ReadonlyMap<string, ReactNode>;
};

function createOutletStore() {
  // Annotated rather than passed as type arguments — see the note in `use-modal-actions.tsx`:
  // exactly two type arguments match `createStore`'s generic overload by arity.
  const initial: OutletSnapshot = { modals: new Map() };

  return createStore(initial, ({ set }): OutletStoreMethods => {
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
  });
}

type OutletStoreMethods = {
  register(id: string, node: ReactNode): void;
  unregister(id: string): void;
};

// ── ModalOutlet Component ───────────────────────────────────────────────────

/**
 * Scoped outlet that automatically renders modals from descendant `useModal` calls.
 *
 * When a `ModalOutlet` wraps a subtree, every `useModal` inside it registers
 * its dialog with the outlet instead of returning it via `Modal`. This lets
 * you use `useModal` without manually placing `{modal.Modal}` in JSX.
 *
 * `modal.Modal` becomes `null` when an outlet is present — existing
 * destructuring still works, it simply renders nothing.
 *
 * Outlets are nestable: the nearest ancestor outlet wins.
 *
 * @example
 * ```tsx
 * function App() {
 *   // Modals opened anywhere below render here.
 *   return (
 *     <ModalOutlet>
 *       <Dashboard />
 *     </ModalOutlet>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { open } = useModal({ id: 'info', render: () => <div>Hello</div> });
 *   // No need to render `Modal` — the outlet handles it.
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
export function ModalOutlet({ children }: { readonly children: ReactNode }) {
  // Context value is created once alongside the store so that its identity
  // is stable across re-renders. Without this, every outlet re-render would
  // produce a new context object, causing all descendant useModal consumers
  // to re-render and re-register their modals in an infinite loop.
  const [init] = useState(() => {
    const store = createOutletStore();
    const ctx: ModalOutletContextValue = {
      register: (id, node) => {
        store.register(id, node);
      },
      unregister: (id) => {
        store.unregister(id);
      },
    };
    return { store, ctx };
  });

  const snap = useSyncExternalStore(init.store.subscribe, init.store.getSnapshot);

  return (
    <ModalOutletContext value={init.ctx}>
      {children}
      {Array.from(snap.modals.entries(), ([id, node]) => {
        return <Fragment key={id}>{node}</Fragment>;
      })}
    </ModalOutletContext>
  );
}
