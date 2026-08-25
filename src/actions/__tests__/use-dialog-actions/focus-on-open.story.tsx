import { useState } from 'react';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * An action claiming the dialog's opening focus.
 *
 * The input is deliberately first in the DOM: it is what `showModal()` focuses on its own, so a
 * test cannot pass by accident — focus reaching `Cancel` means the option did it. The confirm
 * action fails on purpose, because the same button is where focus has to return afterwards.
 */
export function FocusOnOpenHarness() {
  const [attempts, setAttempts] = useState(0);

  const { open, isVisible, Dialog } = useDialog<void, 'confirm' | 'cancel'>({
    id: 'focus-on-open',
    ariaLabel: 'Delete everything',
    render: ({ action, error }) => {
      return (
        <div style={dialogStyle}>
          <input data-testid="foo-input" defaultValue="first focusable" />
          <button {...action('cancel', { focusOnOpen: true })} data-testid="foo-cancel">
            Cancel
          </button>
          <button
            {...action('confirm', {
              onAction: async () => {
                setAttempts((n) => {
                  return n + 1;
                });
                await new Promise((resolve) => {
                  setTimeout(resolve, 20);
                });
                throw new Error('Deletion failed');
              },
            })}
            data-testid="foo-confirm"
          >
            Delete
          </button>
          <span data-testid="foo-attempts">{attempts}</span>
          <span data-testid="foo-error">{error ? error.message : ''}</span>
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
        Open Focus Dialog
      </button>
      <span data-testid="foo-is-visible">{isVisible ? 'open' : 'closed'}</span>
      {Dialog}
    </div>
  );
}
