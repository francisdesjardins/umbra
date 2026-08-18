import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { dialogManager, useMessageModal } from 'umbra/react';
import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';

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
type ArchiveReceipt = { readonly room: string; readonly archivedAt: string };

/**
 * A predicate, not parse-or-null: `data?: unknown` comes back, and each side distrusts the other.
 */
function isArchiveReceipt(data: unknown): data is ArchiveReceipt {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const { room, archivedAt } = data as { room?: unknown; archivedAt?: unknown };
  return typeof room === 'string' && typeof archivedAt === 'string';
}

/** Who is allowed to ask at all — a claim, checked against a list the owner keeps. */
const TRUSTED_SOURCES = new Set(['shell:nav', 'deep-link']);

export function OpenRequestExample() {
  const [room, setRoom] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);

  const modal = useMessageModal<ArchiveReceipt, 'confirm' | 'cancel'>({
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
            <MessageModal.Icon sx={{ mb: 0 }} type="warning" />
            <Typography id="open-request-demo-title" variant="h6">
              Archiver la salle {room}?
            </Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Typography color="text.secondary" variant="body2">
              Ouverte par une demande venue d’ailleurs, que ce dialogue a validée avant d’accepter.
            </Typography>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button size="small" variant="outlined" {...action('cancel')}>
              Annuler
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('confirm', (close) => {
                // `TData` on the hook checks it here; it reaches the caller as `unknown`.
                close({ room: room ?? '—', archivedAt: new Date().toISOString() });
              })}
            >
              Archiver
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
      setLog(`Refusée — ${outcome.reason}`);
      return;
    }
    setLog('Acceptée — en attente de la fermeture…');
    // Opt-in second half: the decision settles now, the close when the user is done.
    const [, result] = await outcome.closed;
    if (result === null) {
      setLog('Le dialogue a disparu avant de répondre');
      return;
    }
    if (!isArchiveReceipt(result.data)) {
      // Not an error — 'cancel' and 'dismiss' close with no payload at all.
      setLog(`Fermée sans reçu : ${result.reason}`);
      return;
    }
    setLog(`Salle ${result.data.room} archivée à ${result.data.archivedAt}`);
  };

  return (
    <ExampleLayout modals={modal.Modal} result={log}>
      <Stack spacing={1.5} sx={{ width: '100%' }}>
        <TextField
          label="context.source"
          onChange={(event) => {
            setSource(event.target.value);
          }}
          size="small"
          value={source}
        />
        <TextField
          label="data (JSON)"
          onChange={(event) => {
            setRawPayload(event.target.value);
          }}
          size="small"
          value={rawPayload}
        />
        <Alert severity="info" variant="outlined">
          Acceptée seulement si <code>source</code> est <code>shell:nav</code> ou{' '}
          <code>deep-link</code> et que <code>data</code> porte une <code>room</code> non vide.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Shared.Button
            onClick={() => {
              void ask();
            }}
            size="small"
            variant="contained"
          >
            Demander l’ouverture
          </Shared.Button>
          <Shared.Button
            onClick={() => {
              setLog(null);
              // The other door: no asking, no validation, and `room` is whatever it last was.
              dialogManager.open('open-request-demo');
            }}
            size="small"
            variant="outlined"
          >
            Ordonner (open)
          </Shared.Button>
        </Stack>
      </Stack>
    </ExampleLayout>
  );
}
