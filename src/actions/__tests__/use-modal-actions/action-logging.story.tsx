import { useEffect, useState } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useModal } from '../../../react/use-modal.js';
import { setLogLevel } from '../../../utils/logger.js';

/**
 * Exercises the action lifecycle logging at the `runAction` chokepoint.
 *
 * Enables all debug namespaces on mount so `Action started` / `Action close` /
 * `Action completed` / `Action failed` are emitted (and capturable via the
 * browser console in the CT test). The confirm handler closes with the given
 * `payload` to prove the close data is never written to a log line.
 */
export function ActionLoggingHarness({ payload }: { readonly payload: string }) {
  const [lastReason, setLastReason] = useState('');

  useEffect(() => {
    setLogLevel('*');
    return () => {
      setLogLevel(false);
    };
  }, []);

  // The payload is `confirm`'s, inferred through `actions` — not restated here.
  const { open, isVisible, Modal } = useModal<{ secret: string }, 'boom' | 'confirm'>({
    id: 'ctrl-logging',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('confirm', (close) => {
              close({ secret: payload });
            })}
          >
            Confirm
          </button>
          <button
            {...action('boom', () => {
              throw new Error('boom failed');
            })}
          >
            Fail
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
