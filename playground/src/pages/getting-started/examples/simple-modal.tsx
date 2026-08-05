import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Stack, Typography } from '@mui/material';
import { defineAction, useMessageModal, useModalActions, useStore } from 'umbra/react';

export const MODAL_ID = 'simple';

const resultStore = createResultStore();

export function SimpleModalExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    confirm: defineAction(),
  });

  const simpleModal = useMessageModal({
    id: MODAL_ID,
    actions,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="success" sx={{ mb: 0 }} />
            <Typography variant="h6">Simple Modal</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.OverflowContainer
              sx={{ maxHeight: '20vh' }}
              overflowSx={{
                pr: 'calc(24px - var(--scrollbar-width))',
              }}
            >
              <Stack spacing={2}>
                <Typography>
                  This modal uses MessageModal.Content with a scrollable Container to handle
                  overflow text. When the content exceeds the available height, the container
                  becomes scrollable while the title and footer remain fixed.
                </Typography>
                <Typography>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                  incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                  exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </Typography>
                <Typography>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                  fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                  culpa qui officia deserunt mollit anim id est laborum.
                </Typography>
              </Stack>
            </Shared.OverflowContainer>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...actions.confirm()}>
              OK
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
    <ExampleLayout result={result} modals={simpleModal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await simpleModal.open();
          const [, closeResult] = await simpleModal.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </Shared.Button>
    </ExampleLayout>
  );
}
