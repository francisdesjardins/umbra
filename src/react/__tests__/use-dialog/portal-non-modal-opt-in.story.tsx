import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that `portal: true` on a non-modal dialog forces createPortal.
 * The `<dialog>` parent should be `document.body`.
 */
export function PortalNonModalOptInHarness() {
  const [lastReason, setLastReason] = useState('');
  const [dialogParent, setDialogParent] = useState('');

  const { open, isVisible, Dialog } = useDialog<void, 'confirm'>({
    id: 'portal-non-modal-opt-in',
    nonModal: true,
    portal: true,
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 0,
      exitDuration: 0,
      transitionProperty: 'opacity',
    },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-dialog content</p>
          <button
            onClick={() => {
              handle.close('confirm');
            }}
          >
            Confirm
          </button>
        </div>
      );
    },
    prepare: () => {
      const dialog = document.querySelector('[data-testid="dialog-portal-non-modal-opt-in"]');
      setDialogParent(dialog?.parentElement?.tagName ?? 'unknown');
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div data-testid="container">
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Non-Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="dialog-parent">{dialogParent}</span>
      {Dialog}
    </div>
  );
}
