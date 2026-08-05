import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { ContentTransition } from '@/entities/modal-template/ui/mui/shared/content/ContentTransition';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { createResultStore } from '@/shared/lib/createResultStore';
import { CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { useSlideModal, useStore } from 'umbra/react';

export const MODAL_ID = 'slide-async-open';

const resultStore = createResultStore();

export function SlideAsyncOpenExample() {
  const { result } = useStore(resultStore);

  const panel = useSlideModal<void, 'close'>({
    id: MODAL_ID,
    direction: 'right',
    onOpen: async () => {
      await new Promise((resolve) => {
        return setTimeout(resolve, 2000);
      });
    },
    render: ({ direction, isPreparing, action }) => {
      return (
        <SlideModal.DefaultLayout direction={direction}>
          <SlideModal.Header>
            <SlideModal.Title>
              {isPreparing ? <Skeleton width={140} /> : 'User Profile'}
            </SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <ContentTransition
              pending={isPreparing}
              fallback={
                <Stack spacing={2} sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <CircularProgress size={20} />
                    <Typography color="text.secondary">Loading profile...</Typography>
                  </Stack>
                  <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
                  <Skeleton width="80%" />
                  <Skeleton width="60%" />
                  <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
                </Stack>
              }
            >
              <Stack spacing={2}>
                <Shared.Heading>Alex Johnson</Shared.Heading>
                <Shared.Message>Senior Product Designer</Shared.Message>
                <Shared.DetailList
                  items={['5 years at company', 'San Francisco, CA', 'alex@example.com']}
                />
                <Shared.Hint>Profile data was loaded asynchronously via onOpen.</Shared.Hint>
              </Stack>
            </ContentTransition>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="outlined" {...action('close')}>
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
        Open
      </Shared.Button>
    </ExampleLayout>
  );
}
