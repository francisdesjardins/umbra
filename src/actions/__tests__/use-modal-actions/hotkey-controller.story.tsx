import { useState } from 'react';
import { useModal } from '../../../react/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests Enter hotkey triggers confirm, Escape hotkey triggers cancel.
 * preventEscapeClose prevents native dismiss when Escape is a hotkey.
 */
export function HotkeyActionsHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm'>({
    id: 'ctrl-hotkey',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('confirm', {
              hotkey: Key.Enter,
              onAction: (close) => {
                close();
              },
            })}
          >
            Confirm
          </button>
          <button
            {...action('cancel', {
              hotkey: Key.Escape,
              onAction: (close) => {
                close();
              },
            })}
          >
            Cancel
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
        Open
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
