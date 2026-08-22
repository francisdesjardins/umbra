/**
 * The other half of the registry's contract, compiled on its own because declaration merging is
 * global: augmenting `ModalRegistry` here would narrow every id in the main project, and the
 * `string` fallback that `src/core/__tests__/registry.test-d.ts` asserts would stop being reachable.
 *
 * Run by `yarn type-check:registry`, which `yarn check` calls.
 */

import type { DataOf, ModalId, ReasonOf } from '../src/core/registry.js';
import { dialogManager } from '../src/manager/dialog-manager.js';
import { useModal } from '../src/react/use-modal.js';

declare module '../src/core/registry.js' {
  interface ModalRegistry {
    'delete-account': { data: { id: string }; reason: 'confirm' | 'cancel' };
    'session-warning': { reason: 'extend' | 'sign-out' };
  }
}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
type Equals<A, B> =
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the two-signature identity trick needs a parameter the rule counts as used once
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

/** Declaring modals narrows the id everywhere, which is the whole point. */
export type _IdIsTheUnion = Assert<Equals<ModalId, 'delete-account' | 'session-warning'>>;
export type _ReasonNarrows = Assert<Equals<ReasonOf<'delete-account'>, 'confirm' | 'cancel'>>;
export type _DataNarrows = Assert<Equals<DataOf<'delete-account'>, { id: string }>>;

/** A modal that declares no payload still gets one answer, not `unknown`. */
export type _NoDataIsVoid = Assert<Equals<DataOf<'session-warning'>, void>>;

export function _manager() {
  dialogManager.open('delete-account');
  dialogManager.close('delete-account', 'confirm');
  dialogManager.close('delete-account', 'dismiss');

  // @ts-expect-error a typo in the id
  dialogManager.open('delete-acount');

  // @ts-expect-error a computed id has to say so — `as ModalId` is the documented escape
  dialogManager.open(String(Math.round(1)));
}

/** Inferred from the id literal: no type argument, and both halves come back typed. */
export function Inferred() {
  return useModal({
    id: 'delete-account',
    ariaLabel: 'Delete account',
    render: ({ handle }) => {
      handle.close('confirm', { id: '7' });
      // @ts-expect-error 'extend' belongs to session-warning
      handle.close('extend');
      return null;
    },
    onClose: (result) => {
      const reason: 'confirm' | 'cancel' | 'dismiss' = result.reason;
      void reason;
    },
  });
}

/** The explicit form, the id as the one type argument. */
export function Explicit() {
  return useModal<'session-warning'>({
    id: 'session-warning',
    ariaLabel: 'Session warning',
    render: ({ handle }) => {
      handle.close('extend');
      return null;
    },
  });
}

/**
 * **The one thing the explicit form does not buy.** `useModal<'session-warnin'>` is not an error:
 * a type argument that fails the first overload's constraint falls to the second, where it is read
 * as `TData` — a perfectly legal payload type. Only the `id` *value* is checked.
 *
 * So the explicit form is a convenience for naming what is already inferred, not a second place
 * typos are caught. The value is, which is the one that matters, and it is asserted above.
 */
export function ExplicitTypoFallsThrough() {
  const loose = useModal<'session-warnin'>({
    // @ts-expect-error the id value is still checked, which is where the typo is caught
    id: 'session-warnin',
    ariaLabel: 'x',
    render: () => {
      return null;
    },
  });
  return loose;
}
