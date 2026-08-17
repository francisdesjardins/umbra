import type { ModalPhase } from '../core/types.js';

/**
 * Inputs to {@link canDismiss} — everything the guard needs, with no React, DOM or action coupling;
 * `hasRunningAction` is read from the actions bridge at the call site as a plain boolean.
 */
export type DismissGate = {
  /** Current lifecycle phase of the modal. */
  readonly phase: ModalPhase;
  /** Whether the `prepare` callback is still executing (see `ModalStoreSnapshot.isPreparing`). */
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
