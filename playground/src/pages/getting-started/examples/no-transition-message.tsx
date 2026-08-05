import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Typography } from '@mui/material';
import { defineAction, useMessageModal, useModalActions, useStore } from 'umbra/react';

export const MODAL_ID = 'no-transition-message';

const NO_ANIMATION = {
  entrance: { opacity: 1 },
  exit: { opacity: 0 },
  duration: 0,
  exitDuration: 0,
  transitionProperty: 'opacity',
};

const resultStore = createResultStore();

export function NoTransitionMessageExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    confirm: defineAction(),
  });

  const modal = useMessageModal({
    id: MODAL_ID,
    animation: NO_ANIMATION,
    actions,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Title>No Transition</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Typography>
              This modal opens and closes instantly — no fade animation. Useful when your PO insists
              transitions feel slow.
            </Typography>
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
    <ExampleLayout result={result} modals={modal.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await modal.open();
          const [, closeResult] = await modal.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </Shared.Button>
    </ExampleLayout>
  );
}
