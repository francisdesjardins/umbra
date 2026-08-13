import { useEffect, useState } from 'react';
import { reconcileOpen } from '../../../core/reconcile-open.js';
import { useLookup } from '../../use-lookup.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A controlled `<Panel open={…} />`, written the way `reconcileOpen`'s own documentation shows.
 *
 * The helper is exported from the root with a unit test over its decision table, and was exercised by
 * **no binding at all** — so what nothing checked was the thing it exists for: that the pattern built
 * on it behaves, in a browser, on a real `<dialog>`.
 *
 * Two claims, and both are properties a naive reconciliation gets wrong:
 *
 * - **The prop is authoritative.** A dialog opened from somewhere else — `dialogManager.open(id)`, a
 *   restored stack — is put back, rather than left on screen while its call site believes it is closed
 *   and has no way to close it.
 * - **A user dismissal does not turn into a loop.** The dialog closes, the call site lowers the prop in
 *   its `onClose`, and the reconciliation must agree that there is nothing to do. Reading `isVisible`
 *   instead of `phase` is what breaks here: it stays true through the exit, so the comparison finds
 *   "prop says closed, dialog says open" and closes a dialog that was already leaving — or, with the
 *   prop still high for a frame, opens it again. `open-count` is what makes either visible.
 *
 * The exit is deliberately **not** instant: the window in which `isVisible` and `phase` disagree is the
 * whole of what the helper is about, and a zero-duration exit closes it.
 */
export function ReconcileOpenHarness() {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [reconciliations, setReconciliations] = useState<string[]>([]);

  const modal = useModal<void, 'close'>({
    id: 'reconcile-panel',
    ariaLabel: 'Reconciled panel',
    // Non-modal, and not incidental: a controlled `<Panel open={…} />` is the archetypal non-modal
    // case, and a `showModal()` dialog would put the very buttons that drive the prop out of reach —
    // the top layer swallows every click outside the dialog.
    nonModal: true,
    portal: true,
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      exitDuration: 120,
      transitionProperty: 'opacity',
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Reconciled panel</p>
          <button
            data-testid="close-from-inside"
            onClick={() => {
              handle.close('close');
            }}
          >
            Close from inside
          </button>
          <button
            data-testid="close-and-lower"
            onClick={() => {
              // Both at once, which is what reaches the window the helper exists for: `onClose` runs
              // when the exit *finishes*, so a call site that only lowers the prop there never sees
              // `phase` and `isVisible` disagree. An application that closes and updates its own
              // state in one handler does.
              handle.close('close');
              setOpen(false);
            }}
          >
            Close and lower the prop
          </button>
        </div>
      );
    },
    onClose: () => {
      // What a controlled wrapper does: the dialog told it that it closed, so the prop comes down.
      setOpen(false);
    },
  });

  const info = useLookup('reconcile-panel');
  const phase = info.exists ? info.phase : 'closed';

  useEffect(() => {
    const next = reconcileOpen(phase, open);
    setReconciliations((seen) => {
      return next === 'none' ? seen : [...seen, next];
    });
    if (next === 'open') {
      setOpenCount((count) => {
        return count + 1;
      });
      void modal.open();
    } else if (next === 'close') {
      modal.handle.close('close');
    }
  }, [phase, open, modal]);

  return (
    <div>
      <button
        data-testid="raise-prop"
        onClick={() => {
          setOpen(true);
        }}
      >
        open = true
      </button>
      <button
        data-testid="lower-prop"
        onClick={() => {
          setOpen(false);
        }}
      >
        open = false
      </button>
      <button
        data-testid="open-behind-its-back"
        onClick={() => {
          // Somewhere else in the app opens it by id, with the prop still false.
          modal.dialogManager.open('reconcile-panel');
        }}
      >
        Open it imperatively
      </button>
      <span data-testid="prop">{open ? 'true' : 'false'}</span>
      <span data-testid="phase">{phase}</span>
      <span data-testid="open-count">{openCount}</span>
      <span data-testid="reconciliations">{reconciliations.join(',')}</span>
      {modal.Modal}
    </div>
  );
}
