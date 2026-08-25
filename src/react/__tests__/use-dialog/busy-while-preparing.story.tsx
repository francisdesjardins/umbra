import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A dialog on screen whose content is not there yet — the documented normal state of a loading
 * dialog, and what `aria-busy` on the element is for.
 *
 * The gate is released from a button *inside* the dialog: a `showModal()` dialog is in the top
 * layer, so nothing outside it is clickable while it is open.
 */
export function BusyWhilePreparingHarness() {
  const [release, setRelease] = useState<(() => void) | null>(null);

  const slow = useDialog({
    id: 'busy-slow',
    ariaLabel: 'Loading report',
    prepare: async () => {
      await new Promise<void>((resolve) => {
        setRelease(() => {
          return resolve;
        });
      });
    },
    render: ({ isPreparing }) => {
      return (
        <div style={dialogStyle}>
          <span data-testid="slow-preparing">{isPreparing ? 'preparing' : 'ready'}</span>
          <button
            data-testid="release"
            onClick={() => {
              release?.();
            }}
          >
            Release
          </button>
        </div>
      );
    },
  });

  const instant = useDialog({
    id: 'busy-instant',
    ariaLabel: 'Nothing to load',
    render: () => {
      return <p style={dialogStyle}>No prepare at all.</p>;
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          void slow.open();
        }}
      >
        Open Slow
      </button>
      <button
        onClick={() => {
          void instant.open();
        }}
      >
        Open Instant
      </button>
      {slow.Dialog}
      {instant.Dialog}
    </div>
  );
}
