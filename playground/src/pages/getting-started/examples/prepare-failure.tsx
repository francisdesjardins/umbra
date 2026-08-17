import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { Alert, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useState } from 'react';
import { useMessageModal } from 'umbra/react';
import type { ModalFailure } from 'umbra/react';

export const MODAL_ID = 'prepare-failure';

const resultStore = createResultStore();

/**
 * The other half of `Async Open`: the same card when the fetch throws. Both openings run the same
 * path — the dialog is on screen when `prepare` runs, `isPreparing` settles either way, `aria-busy`
 * returns to `false` — so without `onError` a failed open just looks empty. `onError` reports
 * rather than vetoes, so the failure is held in component state and rendered here.
 */
export function PrepareFailureExample() {
  const { result } = useStore(resultStore);
  const [shouldFail, setShouldFail] = useState(true);
  const [failure, setFailure] = useState<ModalFailure | null>(null);

  const modal = useMessageModal<void, 'close'>({
    id: MODAL_ID,
    ariaLabel: 'Profile',
    prepare: async () => {
      await new Promise((resolve) => {
        return setTimeout(resolve, 600);
      });
      if (shouldFail) {
        throw new Error('The profile service did not answer.');
      }
    },
    // `ModalFailure` is a root export, so a handler can live outside the call; `source` is a closed
    // union, so a new one is a compile error rather than a string compare that stops matching.
    onError: (reported) => {
      setFailure(reported);
    },
    render: ({ isPreparing, action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type={failure ? 'error' : 'info'} sx={{ mb: 0 }} />
            <Typography variant="h6">Profile</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack sx={{ gap: 1.5 }}>
              {isPreparing ? (
                <Typography color="text.secondary">Fetching profile…</Typography>
              ) : failure ? (
                <Alert severity="error" variant="outlined">
                  {failure.error.message}
                </Alert>
              ) : (
                <Typography>Ada Lovelace — Enterprise</Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {failure
                  ? `Reported from ${failure.source}. Without onError this dialog would sit here looking loaded.`
                  : 'Nothing failed. The same open, with the switch off.'}
              </Typography>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...action('close')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Shared.Button
          variant="contained"
          size="small"
          onClick={() => {
            setFailure(null);
            void modal.open();
          }}
        >
          Open
        </Shared.Button>
        <FormControlLabel
          control={
            <Switch
              checked={shouldFail}
              onChange={(event) => {
                setShouldFail(event.target.checked);
              }}
              size="small"
            />
          }
          label="Make the fetch throw"
        />
      </Stack>
    </ExampleLayout>
  );
}
