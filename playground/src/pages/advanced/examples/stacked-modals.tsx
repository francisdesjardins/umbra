import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { Box, Typography } from '@mui/material';
import { useMessageModal, useSlideModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

const resultStore = createResultStore();

export function StackedModalsExample() {
  const { result } = useStore(resultStore);

  const innerModal = useMessageModal<void, 'close'>({
    id: 'inner-modal',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="success" sx={{ mb: 0 }} />
            <Typography variant="h6">Inner Modal (Level 3)</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Heading>Deepest Level</Shared.Heading>
            <Shared.Message>This is the innermost modal at z-index level 3.</Shared.Message>
            <Shared.Hint>Notice how each modal stacks on top of the previous one.</Shared.Hint>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...action('close')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const middleModal = useMessageModal<void, 'close'>({
    id: 'middle-modal',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon type="info" sx={{ mb: 0 }} />
            <Typography variant="h6">Middle Modal (Level 2)</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Shared.Heading>Middle Level</Shared.Heading>
            <Shared.Message>This modal is at z-index level 2.</Shared.Message>
            <Shared.Button
              variant="contained"
              color="success"
              onClick={async () => {
                await innerModal.open();
              }}
            >
              Open Inner Modal
            </Shared.Button>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...action('close')}>
              Close
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const outerSlideModal = useSlideModal<void, 'close'>({
    id: 'outer-slide',
    direction: 'right',
    render: ({ direction, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title>Outer Panel (Level 1)</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Shared.Heading>Outer Level</Shared.Heading>
              <Shared.Message>This is the outermost slide panel at z-index level 1.</Shared.Message>
              <Shared.Button
                variant="contained"
                color="info"
                onClick={async () => {
                  await middleModal.open();
                }}
              >
                Open Middle Modal
              </Shared.Button>
            </Box>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...action('close')}>
              Close Panel
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout
      result={result}
      modals={
        <>
          {innerModal.Modal}
          {middleModal.Modal}
          {outerSlideModal.Modal}
        </>
      }
    >
      <Shared.Button
        variant="contained"
        size="small"
        onClick={async () => {
          await outerSlideModal.open();
          const [, closeResult] = await outerSlideModal.waitForClose();
          resultStore.setResult(`Outer panel closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Start Stack Demo
      </Shared.Button>
    </ExampleLayout>
  );
}
