/**
 * What a declared registry buys, compiled on its own because declaration merging is global:
 * augmenting `ModalRegistry` in the main project would narrow ids for every other type test there.
 *
 * Run by `yarn type-check:registry`, which `yarn type-check` calls.
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

/** A declared id carries its contract. */
export type _ReasonNarrows = Assert<Equals<ReasonOf<'delete-account'>, 'confirm' | 'cancel'>>;
export type _DataNarrows = Assert<Equals<DataOf<'delete-account'>, { id: string }>>;

/** A modal that declares no payload answers `void`, not `unknown`. */
export type _NoDataIsVoid = Assert<Equals<DataOf<'session-warning'>, void>>;

/** An undeclared id keeps the open answer, which lets a project host modals it does not own. */
export type _UndeclaredStaysOpen = Assert<Equals<ReasonOf<'someone-elses-modal'>, string>>;

export function _manager() {
  dialogManager.open('delete-account');
  dialogManager.close('delete-account', 'confirm');
  dialogManager.close('delete-account', 'dismiss');

  // Checked **per id**, which is the guarantee that survives an open id space.
  // @ts-expect-error 'extend' belongs to session-warning
  dialogManager.close('delete-account', 'extend');

  // An id nobody declared still works: a third-party panel, a harness, a computed name.
  dialogManager.open('some-other-modal');
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

/** The explicit form, naming the id as the one type argument. */
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

/** A modal the registry never named still declares, with its reasons left open. */
export function Undeclared() {
  return useModal({
    id: 'third-party-panel',
    ariaLabel: 'Third party',
    render: ({ handle }) => {
      handle.close('whatever-it-likes');
      return null;
    },
  });
}

/** `ModalId` stays assignable from any string, which is what makes the above compile. */
export const _idAcceptsAnyString: ModalId = String(1);

/** Does the generic `requestOpenAndWait` really hand back a typed close, or only compile? */
export async function _requestOpenAndWaitIsTyped() {
  const outcome = await dialogManager.requestOpenAndWait('delete-account', {});
  if (!outcome.accepted) {
    return;
  }
  const [error, result] = await outcome.closed;
  if (error) {
    return;
  }
  const reason: 'confirm' | 'cancel' | 'dismiss' = result.reason;
  const id: string | undefined = result.data?.id;
  void reason;
  void id;
}

/** The imperative twin of a hook's `openAndWait`, typed by the registry. */
export async function _openAndWaitIsTyped() {
  const [error, result] = await dialogManager.openAndWait('delete-account');
  if (error) {
    return;
  }
  const reason: 'confirm' | 'cancel' | 'dismiss' = result.reason;
  const id: string | undefined = result.data?.id;
  // @ts-expect-error 'extend' belongs to session-warning
  const wrong: 'extend' = result.reason;
  void reason;
  void id;
  void wrong;
}

/** An id the registry does not name still opens and waits, with the payload erased. */
export async function _openAndWaitStaysOpen() {
  const [, result] = await dialogManager.openAndWait('third-party-panel');
  void result;
}
