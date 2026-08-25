import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests non-modal dialog: opens with dialog.show() instead of showModal(),
 * no backdrop, clicks pass through, z-index tracked via data attribute.
 */
export function NonModalHarness() {
  const [lastReason, setLastReason] = useState('');
  const [openCount, setOpenCount] = useState(0);

  const { open, isVisible, Dialog } = useDialog<void, 'confirm'>({
    id: 'non-modal-dialog',
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
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div>
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="open-count">{openCount}</span>
      <span data-testid="body-overflow">
        {document.body.hasAttribute('data-dialog-open') ? 'locked' : 'free'}
      </span>
      {Dialog}
    </div>
  );
}
