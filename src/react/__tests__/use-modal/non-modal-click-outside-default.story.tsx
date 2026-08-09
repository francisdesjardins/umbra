import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that dismissOnClickOutside defaults to false — clicking outside
 * does NOT close the dialog when the option is not set.
 */
export function NonModalClickOutsideDefaultHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'confirm'>({
    id: 'click-outside-default',
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
          <p>Default behavior</p>
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
      {Modal}
    </div>
  );
}
