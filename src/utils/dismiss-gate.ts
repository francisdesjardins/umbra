import { DISMISS_REASON } from '../core/dismiss-reason.js';
import type { DismissCause, DismissReason } from '../core/dismiss-reason.js';
import type { DialogPhase } from '../core/types.js';

/**
 * Inputs to {@link canDismiss} — everything the guard needs, with no React, DOM or action coupling;
 * `hasRunningAction` is read from the actions bridge at the call site as a plain boolean.
 */
export type DismissGate = {
  /** Current lifecycle phase of the modal. */
  readonly phase: DialogPhase;
  /** Whether the `prepare` callback is still executing (see `DialogStoreSnapshot.isPreparing`). */
  readonly isPreparing: boolean;
  /** Whether dismissal is allowed while `prepare` is still executing. */
  readonly dismissWhilePreparing: boolean;
  /** Whether a modal action is currently in flight. */
  readonly hasRunningAction: boolean;
};

/**
 * Whether a user-initiated dismissal (dismiss key, backdrop click, click outside) may close the
 * modal right now — the single source of truth for what every dismissal path shares:
 * `attachDialogKeydown`, `attachDialogCancel`, `attachWindowDismissKey`, `attachClickOutside` and
 * `shouldDismissOnBackdropClick`, each of which adds its own check on top (backdrop opt-in, hotkey
 * suppression, foreground, hit testing). A modal already `'closing'` or `'closed'` cannot be
 * dismissed again — `store.close()` is a no-op there, so this just avoids the round trip.
 */
export function canDismiss({
  phase,
  isPreparing,
  dismissWhilePreparing,
  hasRunningAction,
}: DismissGate): boolean {
  if (phase === 'closed' || phase === 'closing') {
    return false;
  }
  // An in-flight action owns the modal until it settles.
  if (hasRunningAction) {
    return false;
  }
  return dismissWhilePreparing || !isPreparing;
}

/**
 * What {@link answerDismiss} needs of a store — the one call it makes, declared as the requirement
 * rather than derived from `ModalStore`, so this module keeps its DOM-free, store-free reach.
 *
 * A method rather than a property: parameters are checked bivariantly on a method, so a modal that
 * narrowed its reasons still satisfies the port. The manager's `RegisteredStore` is written this
 * way for the same reason.
 */
export type DismissTarget = {
  close(reason: DismissReason): boolean;
};

/**
 * The dismissal being answered — its owner, if one asked to answer, and which door it came through.
 *
 * A shape rather than two parameters, the way {@link canDismiss} takes {@link DismissGate}: the
 * pair travels together from the listener that caught the event to the one function that ends it.
 */
export type DismissAnswer = {
  /** The `onDismissRequest` the caller passed, or `undefined` to close the store directly. */
  readonly request: ((cause: DismissCause) => boolean | void) | undefined;
  /** Which door this dismissal came through, so an owner answering all three can tell them apart. */
  readonly cause: DismissCause;
};

/**
 * The last step of a user-initiated dismissal, and the only one a controlled surface changes.
 *
 * Everything before it — which key, whose popup, whose foreground, where the pointer landed, and
 * {@link canDismiss} over all of them — is the same question with the same answer whether the
 * dialog owns its own closing or a prop does. So this is where the two part, in one place rather
 * than once per door: `store.close` by default, a report to the owner when one asked for it.
 *
 * **Every dismissal path calls it**, which is the point of it existing at all. A path that closed
 * the store itself would work perfectly and quietly ignore `onDismissRequest`, so a surface whose
 * `open` is a prop would answer the dismiss key correctly and reopen itself on a backdrop click.
 *
 * Returns whether the dismissal was taken, which only the window dismiss-key listener acts on: it
 * captures, so a press it swallows is a press the page never sees, and an owner that declined has
 * nothing to show for it. A pointer has no such second reader — nothing is prevented on those
 * paths — so a declined click is simply a dialog left open.
 */
export function answerDismiss(target: DismissTarget, answer: DismissAnswer): boolean {
  const { request, cause } = answer;
  if (!request) {
    target.close(DISMISS_REASON);
    return true;
  }
  return request(cause) !== false;
}
