import { fireAndForget } from '../utils/fire-and-forget.js';
import { createLogger } from '../utils/logger.js';
import { findLabellingProblems } from './dialog-labelling.js';
import { refreshTransitionsDisabled, runCloseSequence, showDialog } from './dialog-lifecycle.js';
import { styleRootOf } from './dialog-styles.js';
import { finalizeDialogClose } from './finalize-close.js';
import type {
  CloseSequenceOptions,
  LabellingDiagnosticsOptions,
  DialogDomContext,
  OpenSequenceOptions,
} from './attach-types.js';

const log = createLogger('dialog:lifecycle');

/**
 * The `<dialog>` lifecycle, driven by phase — with no framework deciding what a phase is.
 *
 * The DOM operations themselves live in `dialog-lifecycle.ts`; the two functions here are the
 * sequencing between those and the store, and none of that is a renderer's. A binding calls
 * `syncOpenSequence` when it sees `'opening'` and `syncCloseSequence` on every other phase change.
 *
 * **`sync*` here, `run*` there**, and the prefix is the difference: a `sync*` function is handed a
 * phase and decides whether there is anything to do, so it is safe to call on every pass; a `run*`
 * function in `dialog-lifecycle.ts` does the thing it names, immediately, every time.
 */

/**
 * Show the dialog, schedule its entrance frame, and run `prepare`.
 *
 * A no-op unless the phase is `'opening'` and the element is not already open, which is what
 * makes it safe to call on every render of the opening phase — the guard, not a dependency list,
 * is what stops the work happening twice.
 */
export function syncOpenSequence(ctx: DialogDomContext, options: OpenSequenceOptions): void {
  const { store, getDialog, dialogId, phase, manager } = ctx;
  const { prepare, nonModal, onError } = options;

  if (phase !== 'opening') {
    return;
  }

  const dialog = getDialog();
  if (!dialog || dialog.open) {
    return;
  }

  log('Showing dialog', { id: dialogId, nonModal });

  showDialog(dialog, { nonModal, zIndex: manager.getZIndex(dialogId) });

  // The one moment the manager cannot see for itself: it observes *stores*, and a store reaching
  // `'opening'` is a dialog that has not been shown. So a stack policy would only get to reorder a
  // frame later — one painted frame with the wrong dialog in front. Here it is still the same task
  // as the `showModal()` above, so the reorder lands before anything is painted. A no-op unless
  // `prioritize` was called.
  manager.syncStackOrder(dialogId);

  store.scheduleOpenTransition();

  if (prepare) {
    // The signal is the store's — it aborts on `close()`, which is a transition this sequence
    // does not own and should not be re-deriving from `phase`.
    const signal = store.prepareSignal();
    fireAndForget(
      async () => {
        await prepare(signal);
        log('prepare completed', { id: dialogId });
      },
      {
        onError: (error) => {
          log.error('prepare failed', { id: dialogId, error: error.message });
          // After the log and before `finishPreparing`, so a caller reading `isPreparing` from
          // inside this sees the state the failure happened in rather than the settled one.
          onError?.({ error, source: 'prepare' });
        },
        onSettled: () => {
          store.finishPreparing();
        },
      }
    );
  } else {
    store.finishPreparing();
  }
}

/**
 * Re-measure on `'open'` and again on `'closing'`, run the exit and finalize.
 *
 * **The exit's own duration is the only one that answers the exit's question**, and it is not on
 * the element until the phase is `'closing'` — the binding writes the phase's style during render,
 * so this effect runs after it. Measuring at open alone read the *entrance* duration and applied
 * its verdict to the close: `{ duration: 0, exitDuration: 900 }` — instant in, animated out, an
 * ordinary thing to ask for — computed `0s`, was filed as "transitions are disabled", and lost the
 * exit entirely along with any observable `'closing'` window.
 *
 * The open pass stays, because it is the one that costs nothing: it warms the cache for the common
 * case and keeps the answer this open's rather than the first open's. The closing pass is one
 * `getComputedStyle` read against dropping an animation the caller asked for.
 *
 * Both readings still catch what the measurement is chiefly for — a `prefers-reduced-motion` rule
 * setting `transition: none !important` computes to `0s` at either moment.
 *
 * @returns The teardown for the exit listeners, or `undefined` when nothing was attached.
 */
export function syncCloseSequence(
  ctx: DialogDomContext,
  options: CloseSequenceOptions
): (() => void) | undefined {
  const { store, getDialog, dialogId, phase } = ctx;
  const { nonModal, primaryProperty, exitDuration, onError } = options;

  const dialog = getDialog();
  if (!dialog) {
    return undefined;
  }

  if (phase === 'open') {
    refreshTransitionsDisabled(dialog);
    return undefined;
  }

  if (phase !== 'closing') {
    return undefined;
  }

  // The element now carries the exit style, which the open pass could not have seen.
  refreshTransitionsDisabled(dialog);

  return runCloseSequence(dialog, {
    nonModal,
    primaryProperty: primaryProperty,
    exitDuration,
    finalize: () => {
      finalizeDialogClose(store, {
        dialog,
        onCloseError: (error) => {
          log.error('onClose callback failed', { id: dialogId, error: error.message });
          onError?.({ error, source: 'onClose' });
        },
      });
    },
    log: (how) => {
      if (how === 'fallback-timeout') {
        log.warn('Animation fallback timeout', { id: dialogId, exitDuration });
        return;
      }
      log('Close finished', { id: dialogId, how });
    },
  });
}

/**
 * Dialogs already told about this open. Membership is dropped on `'closed'`, not left to the
 * element's lifetime: a `<dialog>` outlives every open/close cycle, so a per-element cache would
 * stay silent about the *next* open's broken content — the same trap `transitionsDisabledCache`
 * documents from the other side.
 */
const reported = new WeakSet<Element>();

/**
 * Say, once per open, when this dialog's labelling cannot do its job.
 *
 * The check that neither a type nor a linter can make: `aria-labelledby` is a string in one place
 * and an `id` on an element in another, and only the DOM knows whether they met. What it reports
 * is in {@link findLabellingProblems}; everything here is about asking at a moment when the answer
 * means something.
 *
 * **Not before `prepare` has settled**, because a name may legitimately point at a heading the
 * caller has not been able to render yet — a dialog that shows a spinner while it loads is the
 * documented normal case, not an edge one, and a component test on two bindings pins that it stays
 * quiet there. That guard is the whole of the timing this needs: by the phase `'open'`, every
 * binding has committed its content, `DialogOutlet` included. That one was the suspect — it
 * registers its node from an effect, a commit behind — and it is not one, because the phase
 * reaches `'open'` on its own frame, after the outlet has rendered. Deferring a frame on top of
 * that was tried, measured against all three cases, and changed nothing; it is not here.
 */
export function syncLabellingDiagnostics(
  ctx: DialogDomContext,
  options: LabellingDiagnosticsOptions
): void {
  const { getDialog, dialogId, phase } = ctx;

  const dialog = getDialog();
  if (!dialog) {
    return;
  }

  if (phase === 'closed') {
    reported.delete(dialog);
    return;
  }

  if (phase !== 'open' || options.isPreparing || reported.has(dialog)) {
    return;
  }
  reported.add(dialog);

  const root = styleRootOf(dialog);
  if (!root) {
    // A detached fragment resolves nothing, and "we cannot tell" is not "it is broken".
    return;
  }

  const problems = findLabellingProblems(
    {
      label: dialog.getAttribute('aria-label'),
      labelledBy: dialog.getAttribute('aria-labelledby'),
      describedBy: dialog.getAttribute('aria-describedby'),
      role: dialog.getAttribute('role'),
      // Off the element like everything else here: in `umbra/vanilla` both the role and the
      // variant are the caller's markup, and the option type never saw either.
      nonModal: dialog.getAttribute('data-dialog-type') === 'non-modal',
    },
    // The element's own tree, which is what the platform resolves an IDREF against — so for a
    // dialog in a shadow root, an id out in the light DOM genuinely resolves to nothing for a
    // screen reader too, and reporting it is right rather than over-strict.
    (id) => {
      return root.getElementById(id) !== null;
    }
  );

  for (const problem of problems) {
    log.warn(`Dialog labelling — ${problem}`, { id: dialogId });
  }
}
