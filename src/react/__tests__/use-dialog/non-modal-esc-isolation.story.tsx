import { useEffect, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests ESC isolation: ESC closes the non-modal panel when focus is outside,
 * and does not propagate to underlying elements (stopPropagation in capture phase).
 * Uses a document bubble-phase listener as a leak detector — it should never fire.
 */
export function NonModalEscIsolationHarness() {
  const [lastReason, setLastReason] = useState('');
  const [leakCount, setLeakCount] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  const { open, isVisible, Modal } = useDialog<void, 'close'>({
    id: 'esc-isolation-panel',
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
          <p>Isolation panel</p>
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
      {Modal}
    </div>
  );
}
