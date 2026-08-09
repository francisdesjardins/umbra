import { useState } from 'react';
import { Key } from '../../../utils/keys.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * An action that fails, and the hotkey retrying it.
 *
 * The button is the dialog's autofocus target and goes `disabled` for as long as the action
 * runs, so focus falls to `<body>` in the meantime. Unless it is put back inside the dialog
 * once the action settles, the dialog's keydown listener never hears the retry: the hotkey is
 * dead for the rest of the modal's life and only the mouse can recover it.
 */
export function ActionErrorHotkeyRetryHarness() {
  const [attempts, setAttempts] = useState(0);

  const { open, isVisible, Modal } = useModal<void, 'save'>({
    id: 'action-error-retry',
    render: ({ action, error }) => {
      // The whole set spreads onto a raw button; the running state reads off `data-loading`.
      const save = action('save', {
        hotkey: Key.Enter,
        onAction: async () => {
          setAttempts((n) => {
            return n + 1;
          });
          await new Promise((resolve) => {
            setTimeout(resolve, 20);
          });
          throw new Error('Save failed');
        },
      });

      return (
        <div style={dialogStyle}>
          <button {...save}>{save['data-loading'] ? 'Saving…' : 'Save'}</button>
          <span data-testid="retry-attempts">{attempts}</span>
          <span data-testid="retry-error">{error ? error.message : ''}</span>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Retry
      </button>
      <span data-testid="retry-is-visible">{isVisible ? 'open' : 'closed'}</span>
      {Modal}
    </div>
  );
}
