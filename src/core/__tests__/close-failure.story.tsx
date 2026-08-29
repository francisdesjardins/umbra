import { useState } from 'react';
import { useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A dialog whose `onClose` throws, closed through the animated path.
 *
 * `onClose` runs detached — no render pass, no promise a caller could await — so without `onError`
 * a failing one is a quiet log and a close that looks like it worked. The animation matters: this
 * is the path a real close takes, and it reports through a different call site than teardown does.
 */
export function ThrowingCloseHarness() {
  const [failure, setFailure] = useState('—');

  const dialog = useDialog<void, 'ok'>({
    id: 'close-failure',
    ariaLabel: 'Throwing close',
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 0 },
      duration: 40,
      exitDuration: 40,
      transitionProperty: 'opacity',
    },
    onClose: () => {
      throw new Error('onClose exploded');
    },
    onError: ({ error, source }) => {
      setFailure(`${source}:${error.message}`);
    },
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button data-testid="close" {...action('ok')}>
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="failure">{failure}</span>
      <span data-testid="visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      {dialog.Dialog}
    </div>
  );
}

/**
 * A dialog whose exit transition never fires, closed anyway.
 *
 * `transitionProperty` names a property the exit style never changes, so no `transitionend` ever
 * arrives — the shape a `display` swap or a `prefers-reduced-motion` override produces. The
 * safety timer is the only thing that finishes the close, and a dialog left on screen because the
 * event it was waiting for never came is the failure it exists to rule out.
 */
export function SilentExitHarness() {
  const dialog = useDialog<void, 'ok'>({
    id: 'silent-exit',
    ariaLabel: 'Silent exit',
    animation: {
      entrance: { opacity: 1 },
      exit: { opacity: 1 },
      duration: 30,
      exitDuration: 30,
      transitionProperty: 'transform',
    },
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button data-testid="close" {...action('ok')}>
            Close
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      {dialog.Dialog}
    </div>
  );
}
