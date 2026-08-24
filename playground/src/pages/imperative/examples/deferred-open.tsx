import { useState } from 'react';
import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { dialogManager, useMessageModal } from 'umbra/react';

const MODAL_ID = 'deferred-open-target';

/**
 * Opening a dialog that has not arrived yet.
 *
 * A modal joins the registry when its component mounts, so an imperative open from a service, a
 * router guard or a deep link can land before the dialog behind a code-split route exists. That is
 * the ordinary case, not a typo — and it used to do nothing quietly, because a `log.warn` is
 * invisible until `setLogLevel`.
 *
 * `open(id)` answers now, and `subscribe` carries `register` / `unregister`, which is what makes the
 * waiter below writable at all. No queue ships in the library on purpose: a held open needs an
 * expiry, and how long a deep link should wait for its route is the application's question.
 *
 * **It waits for the dialog to be open, not for the register that let it try.** Retiring the
 * subscription on `register` is the version that fails, and React's own development double-mount is
 * enough to show it: the first registration is torn down and replaced, so an open fired at it lands
 * on a modal that is about to be unmounted, and the second registration finds nobody listening.
 * Watching for the fact you wanted costs one more branch and survives every cause of that shape.
 */
function openWhenItArrives(id: string, onOpened: (how: string) => void): () => void {
  if (dialogManager.open(id)) {
    onOpened('it was already there');
    return () => {};
  }

  const stop = dialogManager.subscribe((event) => {
    if (event.id !== id) {
      return;
    }
    if (event.type === 'register') {
      // Openable by the time this arrives — that ordering is the event's whole value.
      dialogManager.open(id);
    }
    if (event.type === 'open') {
      stop();
      onOpened('opened when it arrived');
    }
  });
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
      modals={mounted ? <DeferredTarget /> : null}
    >
      <AppButton
        onClick={() => {
          const landed = dialogManager.open(MODAL_ID);
          record(landed ? 'open() → true' : 'open() → false, nothing registered');
        }}
      >
        Open it now
      </AppButton>
      <AppButton
        disabled={waiting}
        onClick={() => {
          setWaiting(true);
          record('waiting for it to arrive…');
          openWhenItArrives(MODAL_ID, (how) => {
            setWaiting(false);
            record(how);
          });
        }}
        variant="outlined"
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
  const modal = useMessageModal({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="success" />
            <MessageModal.Title id={`${MODAL_ID}-title`}>It arrived</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              The open that found nothing did not queue itself. The <code>register</code> event is
              what let a caller hold one until this component mounted.
            </Shared.Message>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('close')}>Close</Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return modal.Modal;
}
