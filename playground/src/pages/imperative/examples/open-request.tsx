import { useState, type CSSProperties } from 'react';
import { dialogManager, useMessageModal } from 'umbra/react';
import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { InfoIcon } from '@/shared/ui/icons';
import styles from '@/pages/imperative/examples/open-request.module.css';

/** The `.input` recipe at card level — these fields sit on the shell's `--app-*` sheet. */
const fieldStyle: CSSProperties = {
  padding: 'var(--app-space-2) var(--app-space-3)',
  // The control edge, not the divider: 1.4.11 asks 3:1 of a boundary that says "type here".
  border: '1px solid var(--app-control-border)',
  borderRadius: 'var(--app-radius)',
  font: 'inherit',
  fontSize: 'var(--app-text-base)',
  background: 'inherit',
  color: 'inherit',
  width: '100%',
};

const labelStyle: CSSProperties = {
  fontSize: 'var(--app-text-sm)',
  fontWeight: 500,
  color: 'var(--app-text-secondary)',
};

/**
 * An open the dialog may refuse: `open(id)` instructs, `requestOpen` asks and the dialog decides —
 * what a shell, deep link or other microfrontend needs, and what a **controlled** dialog requires,
 * an outside instruction holding only until the owner reconciles it back. Payload and `context`
 * cross an ownership boundary, so both are `unknown` and validated below; `context` is a claim (an
 * HTTP `Referer`, not a credential), and `refuse(reason)` reaches the asker.
 */

/** What this dialog agrees to be opened with. Anything else is refused. */
type ArchiveRequest = { readonly room: string };

function parseArchiveRequest(data: unknown): ArchiveRequest | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const room = (data as { room?: unknown }).room;
  return typeof room === 'string' && room.trim() !== '' ? { room } : null;
}

/** And what it closes *with* — the answer, travelling back the way the request came. */
export type ArchiveReceipt = { readonly room: string; readonly archivedAt: string };

/** Who is allowed to ask at all — a claim, checked against a list the owner keeps. */
const TRUSTED_SOURCES = new Set(['shell:nav', 'deep-link']);

export function OpenRequestExample() {
  const [room, setRoom] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);

  const modal = useMessageModal({
    id: 'open-request-demo',
    ariaLabelledBy: 'open-request-demo-title',

    // The opt-in: without it every `requestOpen('open-request-demo', …)` is refused and logged.
    onOpenRequest: (payload, request) => {
      const from = request.context?.source ?? 'inconnu';
      const parsed = parseArchiveRequest(payload);

      // Refusal is explicit; returning refuses silently, leaving the asker nothing to show.
      if (!TRUSTED_SOURCES.has(from)) {
        request.refuse(`source-non-fiable:${from}`);
        return;
      }
      if (parsed === null) {
        request.refuse('charge-utile-invalide');
        return;
      }

      // State first, so the dialog renders once with its data instead of opening empty.
      setRoom(parsed.room);
      void modal.open();
    },

    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="warning" />
            <MessageModal.Title id="open-request-demo-title">
              Archive room {room}?
            </MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Detail>
              Opened by a request from elsewhere, which this dialog validated before accepting.
            </Shared.Detail>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('confirm', (close) => {
                // `TData` on the hook checks it here; it reaches the caller as `unknown`.
                close({ room: room ?? '—', archivedAt: new Date().toISOString() });
              })}
            >
              Archive
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const [source, setSource] = useState('shell:nav');
  const [rawPayload, setRawPayload] = useState('{ "room": "204" }');

  const ask = async () => {
    setLog(null);
    let payload: unknown;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      // Sent as-is: a caller that cannot produce JSON is what the owner's validation is for.
      payload = rawPayload;
    }

    const outcome = await dialogManager.requestOpenAndWait('open-request-demo', {
      payload,
      context: { source },
    });
    if (!outcome.accepted) {
      setLog(`Refused — ${outcome.reason}`);
      return;
    }
    setLog('Accepted — waiting for the close…');
    // Opt-in second half: the decision settles now, the close when the user is done.
    const [, result] = await outcome.closed;
    if (result === null) {
      setLog('The dialog vanished before it answered');
      return;
    }
    if (result.reason !== 'confirm') {
      // Not an error — the contract gives a receipt to 'confirm' alone, so the other two are the
      // ordinary way this ends and the reason is the whole test.
      setLog(`Closed with no receipt: ${result.reason}`);
      return;
    }
    setLog(`Room ${result.data.room} archived at ${result.data.archivedAt}`);
  };

  return (
    <ExampleLayout modals={modal.Modal} result={log}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--app-space-3)',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-1)' }}>
          <label htmlFor="open-request-source" style={labelStyle}>
            context.source
          </label>
          <input
            id="open-request-source"
            onChange={(event) => {
              setSource(event.target.value);
            }}
            style={fieldStyle}
            value={source}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-1)' }}>
          <label htmlFor="open-request-payload" style={labelStyle}>
            data (JSON)
          </label>
          <input
            id="open-request-payload"
            onChange={(event) => {
              setRawPayload(event.target.value);
            }}
            style={fieldStyle}
            value={rawPayload}
          />
        </div>
        <div className={styles['banner']}>
          <InfoIcon className={styles['bannerIcon']} aria-hidden="true" />
          <p className={styles['bannerText']}>
            Accepted only if <code>source</code> is <code>shell:nav</code> or <code>deep-link</code>{' '}
            and <code>data</code> carries a non-empty <code>room</code>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
          <AppButton
            onClick={() => {
              void ask();
            }}
            size="small"
            variant="contained"
          >
            Request the open
          </AppButton>
          <AppButton
            onClick={() => {
              setLog(null);
              // The other door: no asking, no validation, and `room` is whatever it last was.
              dialogManager.open('open-request-demo');
            }}
            size="small"
            variant="contained"
          >
            Instruct (open)
          </AppButton>
        </div>
      </div>
    </ExampleLayout>
  );
}
