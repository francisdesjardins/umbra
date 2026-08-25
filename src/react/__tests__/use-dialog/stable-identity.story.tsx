import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Pins the identity of `open` / `openAndWait` / `handle` across arbitrary
 * re-renders and across a full open → close lifecycle.
 *
 * All three close over the dialog store alone, so they are built once in the
 * hook's `useState` initializer. A consumer must be able to hand them straight
 * to an effect dependency array or a memoized child without shuttling them
 * through a ref first.
 */
export function StableIdentityHarness() {
  const [tick, setTick] = useState(0);

  const dialog = useDialog<void, 'confirm'>({
    id: 'stable-identity',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Dialog content</p>
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
      open: dialog.open,
      openAndWait: dialog.openAndWait,
      handle: dialog.handle,
    };
  });

  const stable =
    first.open === dialog.open &&
    first.openAndWait === dialog.openAndWait &&
    first.handle === dialog.handle;

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
          await dialog.open();
        }}
      >
        Open Dialog
      </button>
      <span data-testid="tick">{tick}</span>
      <span data-testid="is-visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      <span data-testid="identity">{stable ? 'stable' : 'changed'}</span>
      {dialog.Dialog}
    </div>
  );
}
