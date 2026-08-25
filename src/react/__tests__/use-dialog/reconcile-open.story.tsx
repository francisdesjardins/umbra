import { useEffect, useState } from 'react';
import { reconcileOpen } from '../../../core/reconcile-open.js';
import { useLookup } from '../../use-lookup.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A controlled `<Panel open={…} />`, the pattern `reconcileOpen`'s documentation shows, exercised
 * in a browser on a real `<dialog>`. Two claims a naive reconciliation gets wrong: the prop is
 * authoritative, so a dialog opened elsewhere is put back rather than left on screen with no way
 * to close it; and a user dismissal does not loop — reading `isVisible` instead of `phase` stays
 * true through the exit, so the comparison closes a dialog already leaving, or reopens it while
 * the prop is high for a frame. `open-count` makes either visible, and the exit is deliberately
 * not instant because that disagreement window is the whole point.
 */
export function ReconcileOpenHarness() {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [reconciliations, setReconciliations] = useState<string[]>([]);

  const modal = useDialog<void, 'close'>({
    id: 'reconcile-panel',
    ariaLabel: 'Reconciled panel',
    // Non-modal on purpose: a `showModal()` dialog would put the prop-driving buttons out of reach.
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
              // Both at once, which reaches the window the helper exists for: `onClose` runs when
              // the exit finishes, so lowering the prop only there never sees the two disagree.
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
    // The manager is the external system this synchronises with, and recording what the
    // reconciliation asked for is the assertion.
    // oxlint-disable-next-line react/set-state-in-effect
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
      {modal.Dialog}
    </div>
  );
}
