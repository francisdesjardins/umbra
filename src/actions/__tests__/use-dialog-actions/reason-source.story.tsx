import { useState } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useDialog } from '../../../react/use-dialog.js';

/** What the `save` action closes with. Declared on the hook, checked at every door. */
type SaveResult = { readonly id: number };

/**
 * The reason an action is declared with is the reason the dialog closes with, and the payload the
 * hook declares is what its `close(data)` accepts — end to end, into `onClose`.
 */
export function ReasonSourceHarness() {
  const [lastReason, setLastReason] = useState('');
  const [lastId, setLastId] = useState('');

  const { open, Dialog } = useDialog<SaveResult, 'save' | 'close'>({
    id: 'ctrl-reason-source',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('save', (close) => {
              close({ id: 42 });
            })}
          >
            Save
          </button>
          {/* Not `action('dismiss')` — that reason is the library's, for a dialog nobody
              acted on. A button *is* an act, so it carries its own name. */}
          <button {...action('close')}>Close</button>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
      setLastId(result.data ? String(result.data.id) : 'none');
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
      <span data-testid="reason-source-last">{lastReason}</span>
      <span data-testid="reason-source-id">{lastId}</span>
      {Dialog}
    </div>
  );
}
