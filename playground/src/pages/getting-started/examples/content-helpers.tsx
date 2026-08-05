import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Stack } from '@mui/material';
import { useMessageModal, useStore } from 'umbra/react';

export const MODAL_ID = 'helpers';

const resultStore = createResultStore();

export function ContentHelpersExample() {
  const { result } = useStore(resultStore);

  const helpersModal = useMessageModal<void, 'confirm'>({
    id: MODAL_ID,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Title>Custom Composition</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Stack spacing={2}>
              <MessageModal.Icon type="info" />
              <Shared.Heading>Using Content Helpers</Shared.Heading>
              <Shared.Message>
                These helpers provide consistent styling across your modals.
              </Shared.Message>
              <Shared.Detail>This is a detail message with secondary color.</Shared.Detail>
              <Shared.Hint>This is a hint with disabled color.</Shared.Hint>
            </Stack>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...action('confirm')}>
              Got it
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
    <ExampleLayout result={result} modals={helpersModal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await helpersModal.open();
          const [, closeResult] = await helpersModal.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </Shared.Button>
    </ExampleLayout>
  );
}
