import { useState } from 'react';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';
import { useModal } from '../../../core/use-modal.js';
import { Key } from '../../../utils/keys.js';
import { defineAction, useModalActions } from '../../use-modal-actions.js';

/**
 * An action button that is live while `onOpen` is still running, reachable both ways.
 *
 * `onOpen` resolves only when the test clicks "Finish Opening", so the whole window in which
 * `isPreparing` is `true` is under the test's control. The action is bound to a hotkey as well as
 * a button, and the two are meant to be the same trigger.
 */
export function HotkeyWhilePreparingHarness() {
  const [lastReason, setLastReason] = useState('');
  const [release, setRelease] = useState<(() => void) | null>(null);

  const actions = useModalActions({
    // F2, not Enter: a focused <button> is natively activated by Enter, which would make the
    // test pass without the hotkey system ever being consulted.
    confirm: defineAction({ hotkey: Key.F2 }),
  });

  const { open, Modal } = useModal({
    id: 'hotkey-while-preparing',
    actions,
    onOpen: () => {
      return new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    // `isPreparing` comes from the render args, not the hook return — inside `render` the latter
    // is the value this very call is still producing.
    render: ({ isPreparing }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="preparing-flag">{isPreparing ? 'opening' : 'ready'}</span>
          <button {...actions.confirm()}>Confirm</button>
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
