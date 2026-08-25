import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A backdrop click is identified by its target (the `<dialog>` itself), not by coordinates alone.
 * Two cases coordinates get wrong: keyboard activation dispatches a click at `clientX`/`clientY` 0,
 * outside a centred dialog's rect, which would dismiss mid-interaction; and content clicks must
 * still bubble out so user-land handlers above the dialog keep working. `bubbled-clicks` counts
 * what reached the host wrapping `{Modal}`.
 */
export function BackdropHitTestHarness() {
  const [lastReason, setLastReason] = useState('');
  const [bubbled, setBubbled] = useState(0);
  const [activated, setActivated] = useState('no');

  const { open, isVisible, Modal } = useDialog({
    id: 'backdrop-hit-test',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Modal content</p>
          <button
            data-testid="content-button"
            onClick={() => {
              setActivated('yes');
            }}
          >
            Content Button
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
        Open Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="activated">{activated}</span>
      <span data-testid="bubbled-clicks">{bubbled}</span>
      <div
        onClick={() => {
          setBubbled((n) => {
            return n + 1;
          });
        }}
      >
        {Modal}
      </div>
    </div>
  );
}
