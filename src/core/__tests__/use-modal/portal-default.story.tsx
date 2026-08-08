import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Tests that a modal dialog renders inline (no portal) by default.
 * The `<dialog>` parent should NOT be `document.body`.
 */
export function PortalDefaultHarness() {
  const [lastReason, setLastReason] = useState('');
  const [dialogParent, setDialogParent] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'done'>({
    id: 'portal-default',
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
      const dialog = document.querySelector('[data-testid="modal-portal-default"]');
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
