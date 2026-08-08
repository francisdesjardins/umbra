// A second binding, in plain JavaScript, in the browser, with no build step.
//
// `useModal` is React's answer to the same job: hold the state machine, render a <dialog>, and
// register the pair with the manager. Nothing about that job is React's, so here it is again in
// about forty lines — which is the claim "React is one binding, not the library" being cashed
// rather than asserted.
import { createStore, dialogManager } from 'umbra';

/**
 * Register a `<dialog>` with the shared manager and drive it from plain JS.
 *
 * The callback types are the library's own, pulled in with `import(…)` rather than restated:
 * this file is not compiled, but an editor still reads the JSDoc, and a hand-written shape here
 * would be a second definition of a contract that already has one — free to drift, and wrong
 * the moment the real one moves.
 *
 * @param {object} options
 * @param {string} options.id - the id other microfrontends will address it by
 * @param {HTMLDialogElement} options.dialog
 * @param {import('umbra').OpenRequestHandler} [options.onOpenRequest]
 * @param {(result: import('umbra').CloseResult) => void} [options.onClose]
 */
export function bindDialog({ id, dialog, onOpenRequest, onClose }) {
  /** One-shot resolvers for the next close — what `requestOpenAndWait` hands back to its caller. */
  let closeResolvers = [];

  // The same store engine the React binding runs on, exported from the root.
  const store = createStore(
    { phase: 'closed', isPreparing: false, closeResult: null },
    ({ get, set }) => {
      return {
        // The port the manager registers: it touches the DOM only inside these methods.
        beginOpen() {
          if (get().phase !== 'closed') {
            return;
          }
          set((s) => {
            return { ...s, phase: 'open', closeResult: null };
          });
          dialog.showModal();
        },
        // `data` is the payload this dialog closes *with* — the answer, travelling back the way
        // the request came. `CloseResult` is `{ reason, data? }`, and the manager's own
        // `close(id, reason)` cannot carry one, which is exactly why a binding's close does.
        close(reason, data) {
          if (get().phase === 'closed') {
            return false;
          }
          const closeResult = data === undefined ? { reason } : { reason, data };
          set((s) => {
            return { ...s, phase: 'closed', closeResult };
          });
          dialog.close();
          // Drained before `onClose`, and drained by swap: a resolver answers exactly one close,
          // and the next one registered is waiting for the close after it.
          const pending = closeResolvers;
          closeResolvers = [];
          for (const resolve of pending) {
            resolve([null, closeResult]);
          }
          onClose?.(closeResult);
          return true;
        },
        // Part of the manager's port since `requestOpenAndWait` reports the close of a dialog the
        // asker does not own. A second binding pays for it in about six lines.
        addCloseResolver(resolve) {
          closeResolvers.push(resolve);
        },
      };
    }
  );

  dialogManager.register(id, store, {
    modalType: 'vanilla',
    nonModal: false,
    ...(onOpenRequest !== undefined && { onOpenRequest }),
  });

  // Escape closes the native dialog behind the store's back; keep the two in step.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    store.close('dismiss');
  });

  return {
    open: () => {
      return dialogManager.open(id);
    },
    close: (reason, data) => {
      return store.close(reason, data);
    },
    subscribe: store.subscribe,
    getSnapshot: store.getSnapshot,
  };
}

/**
 * The five things either side ever has to say, as glyphs. Two microfrontends writing into two
 * columns produce a transcript nobody can read unless the direction is in the line itself:
 * who asked, who was asked, and who decided.
 */
const MARKS = { out: '→', in: '←', yes: '✓', no: '✗', bus: '~', note: '·' };

/**
 * Append a line to a microfrontend's log panel, newest last.
 *
 * @param {string} elementId
 * @param {'out'|'in'|'yes'|'no'|'bus'|'note'} kind
 * @param {string} message
 */
export function logTo(elementId, kind, message) {
  const box = document.getElementById(elementId);
  if (!box) {
    return;
  }
  const line = document.createElement('div');
  line.className = kind;
  line.textContent = `${MARKS[kind]} ${message}`;
  box.append(line);
  box.scrollTop = box.scrollHeight;
}
