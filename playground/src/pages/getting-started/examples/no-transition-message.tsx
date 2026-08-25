import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog } from 'umbra/react';
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

  const modal = useMessageDialog({
    id: MODAL_ID,
    animation: NO_ANIMATION,
    ariaLabelledBy: `${MODAL_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Title id={`${MODAL_ID}-title`}>No Transition</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              This modal opens and closes instantly — no fade animation. Useful when your PO insists
              transitions feel slow.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button variant="primary" {...action('confirm')}>
              OK
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Dialog}>
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
