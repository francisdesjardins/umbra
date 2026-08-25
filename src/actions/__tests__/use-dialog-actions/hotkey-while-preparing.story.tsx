import { useState } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useDialog } from '../../../react/use-dialog.js';
import { Key } from '../../../utils/keys.js';

/**
 * An action button that is live while `prepare` is still running, reachable both ways.
 *
 * `prepare` resolves only when the test clicks "Finish Opening", so the whole window in which
 * `isPreparing` is `true` is under the test's control. The action is bound to a hotkey as well as
 * a button, and the two are meant to be the same trigger.
 */
export function HotkeyWhilePreparingHarness() {
  const [lastReason, setLastReason] = useState('');
  const [release, setRelease] = useState<(() => void) | null>(null);

  const { open, Modal } = useDialog<void, 'confirm'>({
    id: 'hotkey-while-preparing',
    prepare: () => {
      return new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    // `isPreparing` comes from the render args, not the hook return — inside `render` the latter
    // is the value this very call is still producing.
    render: ({ isPreparing, action }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="preparing-flag">{isPreparing ? 'opening' : 'ready'}</span>
          <button {...action('confirm', { hotkey: Key.F2 })}>Confirm</button>
          <button
            onClick={() => {
              release?.();
            }}
          >
            Finish Opening
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
      <span data-testid="hwo-last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
