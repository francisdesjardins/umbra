import { useState } from 'react';
import { DialogManagerProvider } from '../../dialog-manager-context.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/** A modal registered with whichever manager is nearest — never opened, only mounted. */
function BystanderModal() {
  const { Modal } = useModal({
    id: 'two-managers-bystander',
    render: () => {
      return null;
    },
  });

  return <div>{Modal}</div>;
}

/**
 * Two dialog managers, one body.
 *
 * The blocking modal belongs to the outer manager, so the body scroll lock is held on its
 * behalf. The nested provider owns a second, isolated manager with nothing open — and its own
 * registry churn (here, a modal unmounting) must not release a lock it never took.
 *
 * The toggle lives inside the blocking modal's render callback: that modal owns the top layer,
 * so a button outside it would not be clickable while it is open.
 */
export function ScrollLockTwoManagersHarness() {
  const [bystanderMounted, setBystanderMounted] = useState(true);

  const { open, Modal } = useModal({
    id: 'two-managers-blocking',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Blocking modal (manager A)</p>
          <button
            onClick={() => {
              setBystanderMounted(false);
            }}
          >
            Unmount Bystander
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Blocking
          </button>
        </div>
      );
    },
  });

  return (
    <div style={{ minHeight: '200vh' }}>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Blocking
      </button>
      <DialogManagerProvider>{bystanderMounted ? <BystanderModal /> : null}</DialogManagerProvider>
      {Modal}
    </div>
  );
}
