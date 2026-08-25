import { useEffect, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { Key } from '../../../utils/keys.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests non-modal with custom dismissKey (Delete). Verifies Delete closes the panel
 * from outside focus and does not leak, while Escape does not close it.
 */
export function NonModalCustomDismissKeyHarness() {
  const [lastReason, setLastReason] = useState('');
  const [leakCount, setLeakCount] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        setLeakCount((c) => {
          return c + 1;
        });
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, []);

  const { open, isVisible, Dialog } = useDialog<void, 'close'>({
    id: 'non-modal-custom-dismiss',
    nonModal: true,
    dismissKey: Key.Delete,
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
          <p>Non-dialog custom dismiss</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close Panel
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
        Open Panel
      </button>
      <button data-testid="outside-button">Outside Button</button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      <span data-testid="leak-count">{leakCount}</span>
      {Dialog}
    </div>
  );
}
