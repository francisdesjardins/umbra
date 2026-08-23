/**
 * What a declared registry buys, compiled on its own because declaration merging is global:
 * augmenting `ModalRegistry` in the main project would narrow ids for every other type test there.
 *
 * Run by `yarn type-check:registry`, which `yarn type-check` calls.
 */

import type { DataOf, ModalId, PayloadOf, ReasonOf } from '../src/core/registry.js';
import { createOpenRequest, dialogManager } from '../src/manager/dialog-manager.js';
import { useModal } from '../src/react/use-modal.js';

declare module '../src/core/registry.js' {
  interface ModalRegistry {
    'delete-account': { data: { id: string }; reason: 'confirm' | 'cancel' };
    'session-warning': { reason: 'extend' | 'sign-out' };
    'patient:merge': { payload: { patientId: string }; reason: 'merged' | 'cancel' };
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

/** The other direction: what a declared modal is *opened* with. */
export type _PayloadNarrows = Assert<Equals<PayloadOf<'patient:merge'>, { patientId: string }>>;

/**
 * And the two fallbacks differ on purpose — an undeclared close carries nothing, an undeclared
 * open carries whatever crossed the boundary.
 */
export type _NoPayloadIsUnknown = Assert<Equals<PayloadOf<'session-warning'>, unknown>>;
export type _UndeclaredPayloadIsUnknown = Assert<Equals<PayloadOf<'someone-elses-modal'>, unknown>>;

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

/** The ask is checked against what the modal said it takes, in both doors. */
export function _requestOpenChecksThePayload() {
  dialogManager.requestOpen('patient:merge', { payload: { patientId: '42' } });
  dialogManager.requestOpen('patient:merge', createOpenRequest({ patientId: '42' }));

  // @ts-expect-error `patientId` is a string, and the modal declared as much
  dialogManager.requestOpen('patient:merge', { payload: { patientId: 42 } });

  // @ts-expect-error a payload of the wrong shape entirely
  dialogManager.requestOpen('patient:merge', { payload: { patient: '42' } });

  // Asking with nothing stays legal: the contract types the payload, it does not require one.
  dialogManager.requestOpen('patient:merge');
  dialogManager.requestOpen('patient:merge', { context: { source: 'portal:nav' } });
}

/**
 * The half an overload pair would have lost. `requestOpenAndWait` keeps two signatures for its
 * *return*, so a wrong payload must fail **both** — constrained in only the first, it would fail
 * that one and land on the permissive one, which is the shape `close` avoided by staying generic.
 */
export async function _requestOpenAndWaitChecksThePayloadToo() {
  const ok = await dialogManager.requestOpenAndWait('patient:merge', {
    payload: { patientId: '42' },
  });
  if (ok.accepted) {
    const [, result] = await ok.closed;
    void result;
  }

  await dialogManager.requestOpenAndWait('patient:merge', {
    // @ts-expect-error the second signature must not rescue a payload the first rejected
    payload: { patientId: 42 },
  });
}

/** An id the registry does not name accepts anything, which is what hosting a stranger means. */
export function _undeclaredPayloadStaysOpen() {
  dialogManager.requestOpen('third-party-panel', { payload: { anything: true } });
  dialogManager.requestOpen('third-party-panel', createOpenRequest('a string'));
}
