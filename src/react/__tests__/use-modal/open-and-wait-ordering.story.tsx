import { useRef, useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * `openAndWait` against the window that makes it necessary.
 *
 * A close resolver waits for the *next* close — replaying a previous one would be a wrong answer
 * rather than a late one — so it has to be registered before anything can close. `prepare` is
 * what makes that window wide enough to fall into: a modal dismissed while it runs closes before
 * an open that resolves after `prepare` has returned, and a resolver added on the following line
 * would wait for a close that already happened.
 *
 * `openAndWait` registers first, which is why the store's `addCloseResolver` is not part of the
 * public surface. The invariant on the store side is pinned in `modal-store.test.ts`; this
 * harness is the same claim through the real React binding and a real `<dialog>`.
 */
export function OpenAndWaitOrderingHarness() {
  const [outcome, setOutcome] = useState('');
  const resolveRef = useRef<(() => void) | null>(null);

  const { openAndWait, isVisible, Modal } = useModal<void, 'confirm'>({
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
