import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Pins the identity of `open` / `waitForClose` / `handle` across arbitrary
 * re-renders and across a full open → close lifecycle.
 *
 * All three close over the modal store alone, so they are built once in the
 * hook's `useState` initializer. A consumer must be able to hand them straight
 * to an effect dependency array or a memoized child without shuttling them
 * through a ref first.
 */
export function StableIdentityHarness() {
  const [tick, setTick] = useState(0);

  const modal = useModal<void, 'confirm'>({
    id: 'stable-identity',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal content</p>
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

  // Captured on the first render only — subsequent renders compare against it.
  const [first] = useState(() => {
    return {
      open: modal.open,
      waitForClose: modal.waitForClose,
      handle: modal.handle,
    };
  });

  const stable =
    first.open === modal.open &&
    first.waitForClose === modal.waitForClose &&
    first.handle === modal.handle;

  return (
    <div>
      <button
        onClick={() => {
          setTick((t) => {
            return t + 1;
          });
        }}
      >
        Force Re-render
      </button>
      <button
        onClick={async () => {
          await modal.open();
        }}
      >
        Open Modal
      </button>
      <span data-testid="tick">{tick}</span>
      <span data-testid="is-visible">{modal.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="identity">{stable ? 'stable' : 'changed'}</span>
      {modal.Modal}
    </div>
  );
}
