import { useEffect, useState } from 'react';
import { DialogManagerProvider } from '../../dialog-manager-context.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * `dialogManager.gate` seen from the door it exists for: a dialog's **own** `open()`.
 *
 * A gate wired only into the manager's imperative doors would pass every other test and leave this
 * one open, which is the whole difference between a kill switch and a suggestion. The policy is
 * re-installed by an effect rather than closing over a mutable box — the compiler forbids writing
 * to a `useState` value — and its disposer is the cleanup, so the two states never both apply.
 */
function GatedDialog() {
  const [blocked, setBlocked] = useState(true);
  const [refusal, setRefusal] = useState('none');
  const [awaited, setAwaited] = useState('none');

  const { open, openAndWait, Dialog, dialogManager } = useDialog<void, 'done'>({
    id: 'gated',
    ariaLabel: 'Gated dialog',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <p>Gated content</p>
          <button {...action('done')}>Close</button>
        </div>
      );
    },
  });

  useEffect(() => {
    return dialogManager.gate(() => {
      return blocked ? 'kill-switch' : undefined;
    });
  }, [blocked, dialogManager]);

  useEffect(() => {
    return dialogManager.subscribe((event) => {
      if (event.type === 'refuse') {
        setRefusal(`${event.reason}:${event.cause}`);
      }
    });
  }, [dialogManager]);

  return (
    <div>
      <button
        data-testid="open"
        onClick={async () => {
          await open();
        }}
      >
        Open Dialog
      </button>
      <button
        data-testid="open-and-wait"
        onClick={async () => {
          const [error] = await openAndWait();
          setAwaited(error ? 'error' : 'closed');
        }}
      >
        Open and wait
      </button>
      <button
        data-testid="lift"
        onClick={() => {
          setBlocked(false);
        }}
      >
        Lift the gate
      </button>
      <span data-testid="refusal">{refusal}</span>
      <span data-testid="awaited">{awaited}</span>
      {Dialog}
    </div>
  );
}

/**
 * Its own provider, and that is the harness's other lesson: a gate is the *manager's*, so one
 * installed against a shared instance refuses every dialog under it — on `/stories`, all 178.
 */
export function OpenGateHarness() {
  return (
    <DialogManagerProvider>
      <GatedDialog />
    </DialogManagerProvider>
  );
}
