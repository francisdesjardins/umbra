import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Tests that a non-modal dialog renders inline (no portal) by default.
 * The `<dialog>` parent should NOT be `document.body`.
 * Also verifies non-modal behavior still works: click-through, z-index, ESC.
 */
export function PortalNonModalDefaultHarness() {
  const [lastReason, setLastReason] = useState('');
  const [dialogParent, setDialogParent] = useState('');
  const [openCount, setOpenCount] = useState(0);

  const { open, isOpen, Modal } = useModal<void, 'confirm'>({
    id: 'portal-non-modal-default',
    nonModal: true,
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
          <p>Non-modal content</p>
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
    onOpen: () => {
      const dialog = document.querySelector('[data-testid="modal-portal-non-modal-default"]');
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
      <button
        data-testid="outside-button"
        onClick={() => {
          setOpenCount((c) => {
            return c + 1;
          });
        }}
      >
        Outside Button
      </button>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="dialog-parent">{dialogParent}</span>
      <span data-testid="open-count">{openCount}</span>
      {Modal}
    </div>
  );
}
