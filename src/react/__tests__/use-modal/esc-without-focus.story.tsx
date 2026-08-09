import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A modal whose content holds nothing focusable — a loading panel, a bare message.
 *
 * `showModal()` has nowhere to put focus in that case, so it stays outside the dialog. Any ESC
 * handling that lives on the dialog element therefore never sees the key, and the browser's own
 * cancel closes the `<dialog>` while the store still believes it is open: the element keeps
 * rendering, but out of the top layer, so it appears wherever it happens to sit in the tree.
 */
export function EscWithoutFocusHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useModal({
    id: 'esc-no-focus',
    render: () => {
      // Deliberately nothing focusable.
      return (
        <div style={dialogStyle}>
          <p>Nothing here can take focus.</p>
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
        Open Unfocusable
      </button>
      <span data-testid="unfocusable-is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="unfocusable-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
