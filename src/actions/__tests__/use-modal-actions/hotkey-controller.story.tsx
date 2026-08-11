import { useState } from 'react';
import { useModal } from '../../../react/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests Enter hotkey triggers confirm, Escape hotkey triggers cancel.
 * preventEscapeClose prevents native dismiss when Escape is a hotkey.
 *
 * The third button carries a *modified* hotkey, which is the only kind that can tell the
 * attribute and the dispatch selector apart: `Enter` and `Escape` serialise identically whether
 * the modifier is spelled `Ctrl` or `Control`, so a suite made only of them is green against a
 * half-applied change.
 */
export function HotkeyActionsHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal<void, 'cancel' | 'confirm' | 'save'>({
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
            data-testid="modified-hotkey"
            {...action('save', {
              hotkey: `Ctrl+${Key.S}`,
              onAction: (close) => {
                close();
              },
            })}
          >
            Save
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
