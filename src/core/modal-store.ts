import { createStore } from '../store/index.js';
import { createLogger } from '../utils/logger.js';
import type { CloseResolver, CloseResult, ModalStoreSnapshot } from './types.js';

const log = createLogger('modal');

/**
 * Closure-based store for modal lifecycle state — the whole `useModal` state
 * machine, with no React in it.
 *
 * Uses `createStore` for the subscribe/getSnapshot contract consumed by
 * `useSyncExternalStore`. Domain methods use `get`/`set` for snapshot state and
 * closure variables for non-reactive internals (pending resolvers, the pending
 * animation frame, the current `onClose`).
 *
 * The method surface is deliberately narrow: each one is a complete transition,
 * not a plumbing primitive. In particular the store owns its own animation frame
 * — callers schedule and cancel it only as a side effect of the transitions they
 * ask for, and never see the handle.
 *
 * DOM element access is kept outside the store (via `useRef` + getter function
 * passed to hooks) to avoid tainting the store as ref-like in React Compiler.
 *
 * @typeParam TData - The close payload this modal carries. `useModal<TData>` instantiates
 * it, which is what makes the whole close path — `close()`, the resolver queue, `onClose`,
 * `waitForClose()` — agree on one payload type without a single assertion.
 */
export function createModalStore<TData = unknown, TReason extends string = string>(id: string) {
  const initial: ModalStoreSnapshot<TData, TReason> = {
    phase: 'closed',
    isPreparing: false,
    closeResult: null,
  };

  return createStore(initial, ({ get, set }) => {
    const closeResolvers: CloseResolver<TData, TReason>[] = [];
    const openResolvers: (() => void)[] = [];
    let rafId = 0;
    let onCloseCallback:
      ((result: CloseResult<TData, TReason>) => void | Promise<void>) | undefined;

    /** Resolve and drop every pending `open()` promise. */
    const flushOpenResolvers = (): void => {
      for (const resolve of openResolvers.splice(0)) {
        resolve();
      }
    };

    return {
      setOnClose(
        fn: ((result: CloseResult<TData, TReason>) => void | Promise<void>) | undefined
      ): void {
        onCloseCallback = fn;
      },

      /**
       * Invoke the registered `onClose`, if there is one. Returns whatever it returns, so a
       * caller can await it; a no-op when nothing is registered.
       *
       * The store *runs* the callback rather than handing it out. Returning it would put a
       * `(result: CloseResult<TData>) => …` in the store's own return type, and a function
       * type in an output position is checked contravariantly — which would make
       * `ModalStore<TData>` unassignable to the `ModalStore` a non-generic consumer (the hook
       * context, `finalizeModalClose`) declares. Keeping the callback inside is what lets
       * `TData` be a real type parameter instead of an erased one.
       */
      runOnClose(result: CloseResult<TData, TReason>): void | Promise<void> {
        return onCloseCallback?.(result);
      },

      /**
       * Request an open, optionally joining the caller to its completion.
       *
       * `onOpened` (when given) settles once `onOpen` has finished — immediately
       * if there is nothing to wait for. Every branch settles it exactly once, so
       * a caller's `open()` promise can never hang:
       * - `'closed'` → start opening, resolve when `onOpen` completes
       * - opening in flight → join it
       * - already open, or closing → resolve now; no reopen is queued
       */
      requestOpen(onOpened?: () => void): void {
        const { phase, isPreparing } = get();

        if (phase !== 'closed') {
          if (isPreparing) {
            // An open is in flight — join it.
            if (onOpened) {
              openResolvers.push(onOpened);
            }
          } else {
            // Already open (or closing) — nothing to wait for.
            onOpened?.();
          }
          return;
        }

        if (onOpened) {
          openResolvers.push(onOpened);
        }
        log('Open requested', { id });
        set({ phase: 'opening', isPreparing: true, closeResult: null });
      },

      /**
       * Move to `'open'` on the next animation frame, so the browser paints the
       * exit/entrance start state once before the entrance transition begins.
       * The frame is cancelled automatically by {@link close}.
       */
      scheduleOpenTransition(): void {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          set((s) => {
            return { ...s, phase: 'open' };
          });
        });
      },

      /** `onOpen` has settled — release the `open()` promises waiting on it. */
      resolveOpen(): void {
        flushOpenResolvers();
        set((s) => {
          return { ...s, isPreparing: false };
        });
      },

      /**
       * Begin closing with the given reason. Returns `false` (a no-op) when the
       * modal is already `'closing'` or `'closed'`, which is what makes every
       * dismissal path safe to call blindly.
       */
      close(reason: TReason | 'dismiss', data?: TData): boolean {
        const { phase } = get();
        if (phase === 'closing' || phase === 'closed') {
          return false;
        }

        // A close can interrupt the opening sequence before its frame runs.
        cancelAnimationFrame(rafId);
        rafId = 0;

        log('Close requested', { id, reason });

        const result = data !== undefined ? { reason, data } : { reason };

        set({ ...get(), phase: 'closing', closeResult: result });
        return true;
      },

      /** Settle the close: release both promise queues and land on `'closed'`. */
      finalize(): void {
        // Defensive flush: a close that interrupts the opening sequence
        // (e.g. unmount cleanup) must not leave open() promises pending.
        flushOpenResolvers();

        const result = get().closeResult;
        if (result) {
          for (const resolve of closeResolvers.splice(0)) {
            resolve([null, result]);
          }
        }

        // closeResult is retained through 'closed' so consumers (e.g. the
        // dialog manager's close event) can still read the reason after the
        // transition; requestOpen resets it on the next open.
        set((s) => {
          return { ...s, phase: 'closed', isPreparing: false };
        });
      },

      /**
       * Settle every waiter that is never going to get an answer.
       *
       * A `waitForClose()` promise resolves from {@link finalize}, which only runs on a real
       * close. A modal can be destroyed without one — unmounted while closed, or unmounted
       * having never opened — and any promise still waiting would then stay pending for the
       * life of the process, holding its continuation (and everything that closure captures)
       * alive while the awaiting code silently never resumes.
       *
       * The waiters get the `[Error, null]` branch of `WaitForCloseResult` rather than the
       * retained `closeResult`: a `waitForClose()` issued after an earlier close is waiting
       * for the *next* one, so replaying the previous reason would be a wrong answer, not a
       * late one.
       *
       * Idempotent, and safe to call after a normal close — both queues are drained by then,
       * so teardown can invoke it unconditionally.
       */
      abandon(): void {
        flushOpenResolvers();

        const pending = closeResolvers.splice(0);
        if (pending.length === 0) {
          return;
        }

        const error = new Error(`Modal "${id}" was destroyed before it closed`);
        for (const resolve of pending) {
          resolve([error, null]);
        }
      },

      addCloseResolver(resolver: CloseResolver<TData, TReason>): void {
        closeResolvers.push(resolver);
      },
    };
  });
}

/**
 * The concrete store `createModalStore` produces.
 *
 * `TData` defaults to `unknown` so consumers that are generic over *any* modal — the internal
 * hook context, `finalizeModalClose` — can name the type without becoming generic themselves.
 * Every member is either a method (bivariant) or covariant in `TData`, which is what makes a
 * `ModalStore<Specific>` assignable to a plain `ModalStore` at those boundaries.
 */
export type ModalStore<TData = unknown, TReason extends string = string> = ReturnType<
  typeof createModalStore<TData, TReason>
>;
