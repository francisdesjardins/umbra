import { answerDismiss, canDismiss } from '../utils/dismiss-gate.js';
import { createLogger } from '../utils/logger.js';
import type { ClickOutsideOptions, DialogDomContext } from './attach-types.js';

const log = createLogger('dialog:click-outside');

/**
 * Dismiss a non-modal dialog when the user clicks outside its bounds.
 *
 * Document-level pointer listeners (covering mouse and touch), attached only while
 * `dismissOnClickOutside` is `true` and the dialog is open. Suppressed while an action is
 * running, and — unless `dismissWhilePreparing` — while `prepare` is still preparing. Only the
 * dialog **in front** responds, which is a stricter test than "the topmost non-modal": no non-modal
 * dialog is in front while a modal one is open, so a panel under a modal dialog answers no
 * click-outside. Harmless in practice — the dialog's own backdrop swallows the pointer first — and
 * worth stating, because the sentence it replaces described a different rule.
 *
 * Only meaningful for non-modal dialogs; a modal one has a backdrop, and the backdrop click is
 * a different path with a different question (did the pointer land outside the box). Both end at
 * `answerDismiss`, so a controlled surface hears this the way it hears the dismiss key.
 *
 * @returns A teardown that removes the listener, or `undefined` when nothing was attached.
 */
export function attachClickOutside(
  ctx: DialogDomContext,
  options: ClickOutsideOptions
): (() => void) | undefined {
  const { store, getDialog, dialogId, phase, manager } = ctx;
  const { dismissOnClickOutside, dismissWhilePreparing, engine, onDismissRequest } = options;

  if (!dismissOnClickOutside || phase === 'closed') {
    return undefined;
  }

  /** Whether the pointer that is currently down went down outside the dialog. */
  let pressedOutside = false;

  const landedOutside = (event: PointerEvent): boolean => {
    const dialog = getDialog();
    return dialog !== null && !(event.target instanceof Node && dialog.contains(event.target));
  };

  const handlePointerDown = (event: PointerEvent) => {
    pressedOutside = landedOutside(event);
  };

  const handlePointerUp = (event: PointerEvent) => {
    const armed = pressedOutside;
    pressedOutside = false;

    // Both ends, because a dismissal is the whole gesture and WCAG 2.5.2 rules out settling it on
    // the down-event. Not `click`: it fires on the common ancestor of the pair, which reads a drag
    // out of the panel as a press on the page.
    if (!armed || !landedOutside(event)) {
      return;
    }

    // Read here rather than at the press: the gesture is judged when it finishes, so an action
    // that started under it still suppresses the dismissal.
    const snap = store.getSnapshot();
    if (
      !canDismiss({
        phase: snap.phase,
        isPreparing: snap.isPreparing,
        dismissWhilePreparing,
        hasRunningAction: engine.aggregated().hasRunningAction,
      })
    ) {
      return;
    }

    // Only the topmost dialog responds — stand down if another dialog is above us.
    if (!manager.lookup().isForeground(dialogId)) {
      return;
    }

    log('Click outside', { id: dialogId });
    answerDismiss(store, { request: onDismissRequest, cause: 'click-outside' });
  };

  /** A gesture the platform took away — a scroll claiming it, a pointer leaving the window. */
  const handlePointerCancel = () => {
    pressedOutside = false;
  };

  document.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('pointerup', handlePointerUp);
  document.addEventListener('pointercancel', handlePointerCancel);
  return () => {
    document.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('pointerup', handlePointerUp);
    document.removeEventListener('pointercancel', handlePointerCancel);
  };
}
