import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that changing a *structural* prop (`portal`) while the modal is open tears the
 * dialog down cleanly rather than leaving it stuck open.
 *
 * A native `<dialog>` cannot survive being remounted into a different DOM structure
 * (inline / portal / contained wrapper), so `useDialog` closes it when such a prop flips.
 * Regression: `portal` was missing from the teardown effect's deps, so toggling it while
 * open left an orphaned, still-open dialog that blocked the page and could not be reopened.
 */
export function StructuralToggleHarness() {
  const [portal, setPortal] = useState(false);
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Dialog } = useDialog<void, 'confirm'>({
    id: 'structural-toggle',
    nonModal: true,
    portal,
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
          <p>Toggle content</p>
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
    <div data-testid="container">
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open
      </button>
      <button
        data-testid="toggle-portal"
        onClick={() => {
          setPortal((p) => {
            return !p;
          });
        }}
      >
        Toggle Portal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Dialog}
    </div>
  );
}
