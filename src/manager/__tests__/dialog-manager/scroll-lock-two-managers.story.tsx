import { useState } from 'react';
import { DialogManagerProvider } from '../../../react/dialog-manager-context.js';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

function BystanderDialog() {
  const { Dialog } = useDialog({
    id: 'two-managers-bystander',
    render: () => {
      return null;
    },
  });

  return <div>{Dialog}</div>;
}

/**
 * Two managers, one body: the outer one holds the lock while the nested provider's manager has
 * only a mounted-never-opened bystander, so its registry churn must not release a lock it never
 * took. The toggle sits inside the dialog's render because that dialog owns the top layer.
 */
export function ScrollLockTwoManagersHarness() {
  const [bystanderMounted, setBystanderMounted] = useState(true);

  const { open, Dialog } = useDialog<void, 'done'>({
    id: 'two-managers',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal dialog (manager A)</p>
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
            Close Dialog
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
        Open Dialog
      </button>
      <DialogManagerProvider>{bystanderMounted ? <BystanderDialog /> : null}</DialogManagerProvider>
      {Dialog}
    </div>
  );
}
