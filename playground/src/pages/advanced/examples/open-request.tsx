import { useState } from 'react';
import { Alert, Stack, TextField, Typography } from '@mui/material';
import { dialogManager, useMessageModal } from 'umbra/react';
import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
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
 */

/** What this dialog agrees to be opened with. Anything else is declined. */
type ArchiveRequest = { readonly room: string };

function parseArchiveRequest(data: unknown): ArchiveRequest | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const room = (data as { room?: unknown }).room;
  return typeof room === 'string' && room.trim() !== '' ? { room } : null;
}

/** Who is allowed to ask at all — a claim, checked against a list the owner keeps. */
const TRUSTED_SOURCES = new Set(['shell:nav', 'deep-link']);

export function OpenRequestExample() {
  const [room, setRoom] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);

  const modal = useMessageModal<void, 'confirm' | 'cancel'>({
    id: 'open-request-demo',

    // The whole opt-in. Without it every `requestOpen('open-request-demo', …)` is declined and
    // logged, and this dialog is reachable only by the code that renders it.
    onOpenRequest: ({ data, context }) => {
      const from = context?.source ?? 'inconnu';
      const parsed = parseArchiveRequest(data);

      if (!TRUSTED_SOURCES.has(from)) {
        setLog(`Refusée — « ${from} » n'est pas dans la liste`);
        return;
      }
      if (parsed === null) {
        setLog(`Refusée — charge utile invalide, venue de « ${from} »`);
        return;
      }

      // Accepted: the state is set first, so the dialog renders once with its data rather than
      // opening empty and filling in.
      setRoom(parsed.room);
      setLog(`Acceptée — demandée par « ${from} »`);
      void modal.open();
    },

    onClose: (result) => {
      setLog(`Fermée : ${result.reason}`);
    },

    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon sx={{ mb: 0 }} type="warning" />
            <Typography variant="h6">Archiver la salle {room}?</Typography>
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
            <Shared.Button variant="contained" {...action('confirm')}>
              Archiver
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const [source, setSource] = useState('shell:nav');
  const [payload, setPayload] = useState('{ "room": "204" }');

  const ask = () => {
    setLog(null);
    let data: unknown;
    try {
      data = JSON.parse(payload);
    } catch {
      // Sent as-is. A caller that cannot even produce JSON is exactly the case the owner's
      // validation exists for, so it is worth being able to try it here.
      data = payload;
    }
    dialogManager.requestOpen('open-request-demo', { data, context: { source } });
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
            setPayload(event.target.value);
          }}
          size="small"
          value={payload}
        />
        <Alert severity="info" variant="outlined">
          Acceptée seulement si <code>source</code> est <code>shell:nav</code> ou{' '}
          <code>deep-link</code> et que <code>data</code> porte une <code>room</code> non vide.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Shared.Button onClick={ask} size="small" variant="contained">
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
