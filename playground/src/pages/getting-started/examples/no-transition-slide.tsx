import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Stack } from '@mui/material';
import { defineAction, useModalActions, useSlideModal, useStore } from 'umbra/react';

export const MODAL_ID = 'no-transition-slide';

const NO_ANIMATION = {
  entrance: { transform: 'translateX(0)' },
  exit: { transform: 'translateX(-100%)' },
  duration: 0,
  exitDuration: 0,
  transitionProperty: 'transform',
};

const resultStore = createResultStore();

export function NoTransitionSlideExample() {
  const { result } = useStore(resultStore);

  const actions = useModalActions({
    close: defineAction(),
  });

  const panel = useSlideModal({
    id: MODAL_ID,
    direction: 'left',
    animation: NO_ANIMATION,
    actions,
    render: ({ direction }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title>No Transition</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Stack spacing={2}>
              <Shared.Heading>Instant Panel</Shared.Heading>
              <Shared.Message>
                This slide panel appears and disappears instantly — no slide animation.
              </Shared.Message>
            </Stack>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...actions.close()}>
              Close
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={panel.Modal}>
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await panel.open();
          const [, closeResult] = await panel.waitForClose();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Panel
      </Shared.Button>
    </ExampleLayout>
  );
}
