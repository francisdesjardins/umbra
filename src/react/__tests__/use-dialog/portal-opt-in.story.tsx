import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that `portal: true` forces the dialog to render via createPortal.
 * The `<dialog>` parent should be `document.body`.
 */
export function PortalOptInHarness() {
  const [lastReason, setLastReason] = useState('');
  const [dialogParent, setDialogParent] = useState('');

  const { open, isVisible, Modal } = useDialog<void, 'done'>({
    id: 'portal-opt-in',
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
          <p>Modal content</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Done
          </button>
        </div>
      );
    },
    prepare: () => {
      const dialog = document.querySelector('[data-testid="modal-portal-opt-in"]');
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
        Open Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="dialog-parent">{dialogParent}</span>
      {Modal}
    </div>
  );
}
