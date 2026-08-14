import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Stack } from '@mui/material';
import { Key, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'mui-message-example';

const resultStore = createResultStore();

export function MuiMessageExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'cancel' | 'delete'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    ariaDescribedBy: `${MODAL_ID}-body`,
    // Its vanilla twin says the same thing with the same role: the point of this page is that the
    // markup differs and the behaviour does not, accessibility included.
    role: 'alertdialog',
    render: ({ action, error }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <MessageModal.Icon type="warning" sx={{ mb: 0 }} />
              <MessageModal.Title id={`${MODAL_ID}-title`}>Delete Item?</MessageModal.Title>
            </Stack>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message id={`${MODAL_ID}-body`}>
              Are you sure you want to delete this item? This action cannot be undone.
            </Shared.Message>
            <Shared.Hint>This is a Material UI modal example.</Shared.Hint>
            {error && (
              <Shared.AlertContent severity="error" sx={{ mt: 2 }}>
                {error.message}
              </Shared.AlertContent>
            )}
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="outlined" {...action('cancel', { hotkey: Key.Escape })}>
              Cancel
            </Shared.Button>
            <Shared.Button
              variant="contained"
              color="error"
              {...action('delete', {
                hotkey: Key.Enter,
                onAction: async (close) => {
                  await simulateApiCall('delete item', 1000);
                  close();
                },
              })}
            >
              Delete
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed with reason: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open MUI Modal
      </Shared.Button>
    </ExampleLayout>
  );
}
