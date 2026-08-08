import type { ModalPhase } from '../core/types.js';

/**
 * Inputs to {@link canDismiss} — everything the guard needs, with no React,
 * DOM, or action coupling. `isActionRunning` is read from the actions bridge
 * at the call site and passed in as a plain boolean.
 */
export type DismissGate = {
  /** Current lifecycle phase of the modal. */
  readonly phase: ModalPhase;
  /** Whether the `prepare` callback is still executing (see `ModalStoreSnapshot.isPreparing`). */
  readonly isPreparing: boolean;
  /** Whether dismissal is allowed while `prepare` is still executing. */
  readonly dismissWhilePreparing: boolean;
  /** Whether a modal action is currently in flight. */
  readonly isActionRunning: boolean;
};

/**
 * Whether a user-initiated dismissal (dismiss key, backdrop click, click outside)
 * may close the modal right now.
 *
 * The single source of truth for the guard chain shared by every dismissal path:
 * `useDialogKeydown` (both the dialog-level and non-modal window-level listeners),
 * `useClickOutside`, and the backdrop click handler in `useModal`. Each path adds
 * its own path-specific check on top (backdrop-click opt-in, action hotkey
 * suppression, foreground check, hit testing) — this covers only what they share.
 *
 * A modal that is already `'closing'` or `'closed'` cannot be dismissed again;
 * calling `store.close()` in those phases is a no-op, so gating here just avoids
 * the pointless round trip.
 */
export function canDismiss({
  phase,
  isPreparing,
  dismissWhilePreparing,
  isActionRunning,
}: DismissGate): boolean {
  if (phase === 'closed' || phase === 'closing') {
    return false;
  }
  // An in-flight action owns the modal until it settles.
  if (isActionRunning) {
    return false;
  }
  return dismissWhilePreparing || !isPreparing;
}
