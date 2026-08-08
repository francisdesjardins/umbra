import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as VanillaMessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { simulateApiCall } from '@/shared/lib/simulate-api-call';
import { Button } from '@mui/material';
import { Key, useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'vanilla-message-example';

const resultStore = createResultStore();

export function VanillaMessageExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'cancel' | 'delete'>({
    id: MODAL_ID,
    render: ({ action, error }) => {
      return (
        <VanillaMessageModal.DefaultLayout>
          <VanillaMessageModal.Header>
            <VanillaMessageModal.Icon variant="warning" />
            <VanillaMessageModal.Title>Delete Item?</VanillaMessageModal.Title>
          </VanillaMessageModal.Header>
          <VanillaMessageModal.Content>
            <Shared.Message>
              Are you sure you want to delete this item? This action cannot be undone.
            </Shared.Message>
            <Shared.Hint>This is a vanilla HTML + CSS modal example.</Shared.Hint>
            {error && (
              <Shared.Alert title="Error" severity="error">
                {error.message}
              </Shared.Alert>
            )}
          </VanillaMessageModal.Content>
          <VanillaMessageModal.Footer>
            <Shared.Button {...action('cancel', { hotkey: Key.Escape })}>Cancel</Shared.Button>
            <Shared.Button
              variant="primary"
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
          </VanillaMessageModal.Footer>
        </VanillaMessageModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed with reason: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed with reason: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Vanilla Modal
      </Button>
    </ExampleLayout>
  );
}
