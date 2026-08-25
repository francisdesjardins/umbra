import { useRef, useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * `openAndWait` against the window that makes it necessary: a close resolver waits for the *next*
 * close (replaying a previous one is a wrong answer, not a late one), so it must be registered
 * first — which is why `addCloseResolver` is not public. `prepare` widens the window: a modal
 * dismissed while it runs closes before an open that resolves after `prepare` returns.
 */
export function OpenAndWaitOrderingHarness() {
  const [outcome, setOutcome] = useState('');
  const resolveRef = useRef<(() => void) | null>(null);

  const { openAndWait, isVisible, Modal } = useDialog<void, 'confirm'>({
    id: 'open-and-wait',
    prepare: () => {
      return new Promise<void>((resolve) => {
        resolveRef.current = resolve;
      });
    },
    render: ({ isPreparing, handle }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="loading-state">{isPreparing ? 'loading' : 'ready'}</span>
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
  });

  return (
    <div>
      <button
        data-testid="open-and-wait"
        onClick={() => {
          // Raced against a deadline, so a hang reports as one instead of stalling the test.
          void (async () => {
            const settled = await Promise.race([
              openAndWait().then(([, result]) => {
                return `settled:${result?.reason ?? 'none'}`;
              }),
              new Promise<string>((resolve) => {
                setTimeout(() => {
                  resolve('hung');
                }, 600);
              }),
            ]);
            setOutcome(settled);
          })();
        }}
      >
        openAndWait()
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="outcome">{outcome}</span>
      {Modal}
    </div>
  );
}
