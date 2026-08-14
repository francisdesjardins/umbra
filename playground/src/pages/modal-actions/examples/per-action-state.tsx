import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { Alert, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useMessageModal } from 'umbra/react';

export const MODAL_ID = 'per-action-state';

const resultStore = createResultStore();

/** Two actions that take their time, so which one is running is a question worth asking. */
const slow = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * `action.isRunning(reason)` — the per-action state, read away from the button that owns it.
 *
 * Spreading an action's props gives that button `data-loading`, and for the button that is
 * enough. Everything else in this dialog — the header, the field, the notice — is not that
 * button, and `hasRunningAction` only tells them that *something* is running. Publishing and
 * saving a draft are not the same wait, and the dialog says which one it is in.
 */
export function PerActionStateExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'draft' | 'publish' | 'cancel'>({
    id: MODAL_ID,
    // A string rather than a reference to the heading below, because that heading is a *status* —
    // it goes from "Ready to publish" to "Publishing…" while the dialog is open. An accessible
    // name that changes under the user is disorienting; the status is content, and reads as such.
    ariaLabel: 'Publish post',
    dismissOnBackdropClick: false,
    render: ({ action, hasRunningAction }) => {
      const publishing = action.isRunning('publish');

      return (
        <MessageModal.DefaultLayout
          slotProps={{ container: { sx: { width: 'min(520px, 100%)' } } }}
        >
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              {hasRunningAction ? <CircularProgress size={18} /> : null}
              <Typography variant="h6">
                {publishing
                  ? 'Publishing…'
                  : action.isRunning('draft')
                    ? 'Saving draft…'
                    : 'Ready to publish'}
              </Typography>
            </Stack>
          </MessageModal.Header>

          <MessageModal.Content>
            <Stack spacing={2}>
              {/* Not an action's button, and it locks for one action rather than for any: a
                  draft still takes edits, a publish does not. */}
              <TextField
                label="Release note"
                size="small"
                fullWidth
                multiline
                rows={2}
                disabled={publishing}
                defaultValue="Ship the per-action state."
              />

              {publishing ? (
                <Alert severity="warning">
                  The note is locked while publishing — that is{' '}
                  <code>isRunning(&apos;publish&apos;)</code>, not the aggregate. Saving a draft
                  leaves it editable.
                </Alert>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Start either action and watch the header, the field and the buttons disagree
                  usefully: every button is disabled while any action runs, but only the running one
                  names itself.
                </Typography>
              )}
            </Stack>
          </MessageModal.Content>

          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel')}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="outlined"
              {...action('draft', async (close) => {
                await slow(1400);
                close();
              })}
            >
              Save draft
            </Shared.Button>
            <Shared.Button
              variant="contained"
              {...action('publish', async (close) => {
                await slow(2000);
                close();
              })}
            >
              Publish
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open the publish dialog
      </Shared.Button>
    </ExampleLayout>
  );
}
