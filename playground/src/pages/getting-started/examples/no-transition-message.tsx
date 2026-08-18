import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

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

  const modal = useMessageModal<void, 'confirm'>({
    id: MODAL_ID,
    animation: NO_ANIMATION,
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Title id={`${MODAL_ID}-title`}>No Transition</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Message>
              This modal opens and closes instantly — no fade animation. Useful when your PO insists
              transitions feel slow.
            </Shared.Message>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="primary" {...action('confirm')}>
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
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open
      </AppButton>
    </ExampleLayout>
  );
}
