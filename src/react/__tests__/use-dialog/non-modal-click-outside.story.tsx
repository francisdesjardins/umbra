import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests dismissOnClickOutside: clicking outside the non-modal dialog closes it,
 * clicking inside does not.
 */
export function NonModalClickOutsideHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Dialog } = useDialog<void, 'confirm'>({
    id: 'click-outside-dialog',
    nonModal: true,
    dismissOnClickOutside: true,
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
          <p>Click outside to dismiss</p>
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
      <button data-testid="outside-button">Outside Button</button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Dialog}
    </div>
  );
}
