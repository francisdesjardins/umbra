import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { dialogManager, useMessageDialog } from 'umbra/react';

const DIALOG_ID = 'deferred-open-target';

/**
 * Opening a dialog that has not arrived yet.
 *
 * A dialog joins the registry when its component mounts, so an imperative open from a router guard
 * or a deep link can land before the dialog behind a code-split route exists — the ordinary case,
 * not a typo, and a `log.warn` about it is invisible until `setLogLevel`. No queue ships in the
 * library on purpose: a held open needs an expiry, and how long to wait is the application's
 * question.
 *
 * **It waits for the dialog to be open, not for the register that let it try.** React's development
 * double-mount shows why: the first registration is torn down and replaced, so an open fired at it
 * lands on a dialog about to be unmounted.
 */
function openWhenItArrives(id: string, onOpened: (how: string) => void): () => void {
  let waited = false;

  // Subscribed **before** the open is attempted, like `openAndWait`'s resolver: an answer that
  // lands inside the call is one a listener added afterwards never hears. It also leaves one return
  // path — an early "it was already there" would hand back a canceller with nothing to cancel.
  const stop = dialogManager.subscribe((event) => {
    if (event.id !== id) {
      return;
    }
    if (event.type === 'register') {
      waited = true;
      // Openable by the time this arrives — that ordering is the event's whole value.
      dialogManager.open(id);
    }
    if (event.type === 'open') {
      stop();
      onOpened(waited ? 'opened when it arrived' : 'it was already there');
    }
  });

  dialogManager.open(id);
  return stop;
}

export function DeferredOpenExample() {
  const [mounted, setMounted] = useState(false);
  const [log, setLog] = useState<readonly string[]>([]);
  const [waiting, setWaiting] = useState(false);

  const record = (line: string) => {
    setLog((lines) => {
      return [line, ...lines].slice(0, 4);
    });
  };

  return (
    <ExampleLayout
      result={log.length === 0 ? null : log.join(' · ')}
      dialogs={mounted ? <DeferredTarget /> : null}
    >
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          const landed = dialogManager.open(DIALOG_ID);
          record(landed ? 'open() → true' : 'open() → false, nothing registered');
        }}
      >
        Open it now
      </AppButton>
      <AppButton
        variant="contained"
        size="small"
        disabled={waiting}
        onClick={() => {
          setWaiting(true);
          record('waiting for it to arrive…');
          openWhenItArrives(DIALOG_ID, (how) => {
            setWaiting(false);
            record(how);
          });
        }}
      >
        Open when it arrives
      </AppButton>
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--app-space-2)',
          cursor: 'pointer',
          minHeight: 'var(--app-space-6)',
        }}
      >
        <input
          checked={mounted}
          onChange={(event) => {
            setMounted(event.target.checked);
            record(event.target.checked ? 'registered' : 'unregistered');
          }}
          style={{ accentColor: 'var(--app-flame)' }}
          type="checkbox"
        />
        The route is mounted
      </label>
    </ExampleLayout>
  );
}

/** The dialog behind the code-split route: it exists only while this is mounted. */
function DeferredTarget() {
  const dialog = useMessageDialog({
    id: DIALOG_ID,
    ariaLabelledBy: `${DIALOG_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="success" />
            <MessageDialog.Title id={`${DIALOG_ID}-title`}>It arrived</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              The open that found nothing did not queue itself. The <code>register</code> event is
              what let a caller hold one until this component mounted.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button {...action('close')}>Close</Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });

  return dialog.Dialog;
}
