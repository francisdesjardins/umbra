import { useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { dialogManager, useMessageModal } from 'umbra/react';
import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';

/**
 * An open the dialog is allowed to refuse.
 *
 * `dialogManager.open(id)` is an instruction and it is the right shape for code that owns the
 * dialog. `requestOpen` is for everything else — a shell, a deep link, another microfrontend —
 * and it asks instead: the request reaches the dialog's own code, which decides.
 *
 * It matters most for a **controlled** dialog, the shape most component-library call sites take:
 * `open` is a prop held by the component that renders it, so an instruction from outside opens it
 * for a moment and its own reconciliation puts it back. Asking costs none of that — nothing moves
 * unless the owner agrees.
 *
 * The payload is `unknown` because it crossed an ownership boundary. So is `context`, which is
 * what the caller *says* about itself and nothing anyone verified — an HTTP `Referer`, not a
 * credential. The owner below validates both, which is the point of the whole arrangement: what
 * it will not accept, it does not open for.
 *
 * And it says so. Every line in the result panel is written by the **caller**, from what
 * `requestOpenAndWait` came back with — the owner only decides. A refusal the asker never hears
 * is a dead end, which is what `request.refuse(reason)` exists to prevent.
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
 * A type predicate rather than a parse-or-null, because the caller's question is a yes/no about
 * a value it already holds: `outcome.closed` resolves with `data?: unknown`, symmetrically with
 * the payload on the way in, and one `if` narrows it for the rest of the block.
 *
 * The point the pair makes together: **both directions cross the boundary unvalidated.** The
 * dialog does not trust what the shell sent, and the shell does not trust what came back.
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

    // The whole opt-in. Without it every `requestOpen('open-request-demo', …)` is refused and
    // logged, and this dialog is reachable only by the code that renders it.
    onOpenRequest: (payload, request) => {
      const from = request.context?.source ?? 'inconnu';
      const parsed = parseArchiveRequest(payload);

      // Refusal is explicit: returning would refuse too, but silently, and the asker below
      // would have nothing to show. Acceptance needs no word — opening is the yes.
      if (!TRUSTED_SOURCES.has(from)) {
        request.refuse(`source-non-fiable:${from}`);
        return;
      }
      if (parsed === null) {
        request.refuse('charge-utile-invalide');
        return;
      }

      // Accepted: the state is set first, so the dialog renders once with its data rather than
      // opening empty and filling in.
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
                // The typed door: `TData` is declared on the hook, so this payload is checked
                // here and arrives at the caller as `unknown` only because it crossed a boundary.
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
      // Sent as-is. A caller that cannot even produce JSON is exactly the case the owner's
      // validation exists for, so it is worth being able to try it here.
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
    // The second half is opt-in: the decision settles now, the close settles when the user is done.
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
    // Narrowed: `result.data` is an `ArchiveReceipt` for the rest of this block.
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
              // The other door, for comparison: it does not ask, and it does not care what this
              // dialog would have said. Nothing validates, and `room` is whatever it last was.
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
