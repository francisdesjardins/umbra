import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Regression harness for backdrop-click hit testing.
 *
 * A backdrop click is identified by its **target** (the `<dialog>` itself), not by
 * coordinates alone. Two cases the coordinate test gets wrong on its own:
 *
 * 1. **Keyboard activation** — pressing Enter on a button dispatches a click with
 *    `clientX`/`clientY` of `0`, which lies outside a centred dialog's rect and would
 *    read as a backdrop click, dismissing the modal mid-interaction.
 * 2. **Ancestor click handlers** — content clicks must still bubble out of the dialog
 *    so user-land handlers above it keep working; the library must not swallow them.
 *
 * `bubbled-clicks` counts clicks that reached the host element wrapping `{Modal}`.
 */
export function BackdropHitTestHarness() {
  const [lastReason, setLastReason] = useState('');
  const [bubbled, setBubbled] = useState(0);
  const [activated, setActivated] = useState('no');

  const { open, isVisible, Modal } = useModal({
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
      {/* Only clicks originating inside the dialog reach this host. */}
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
