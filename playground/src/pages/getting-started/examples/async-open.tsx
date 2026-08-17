import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import { ContentTransition } from '@/entities/modal-template/ui/mui/shared/content/ContentTransition';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createQuery, useQuery } from '@/shared/lib/use-query';
import { Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { useMessageModal } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'async-open';

const resultStore = createResultStore();

type Profile = { readonly name: string; readonly plan: string; readonly fetchedAt: string };

// Declared at module scope, the way a query cache is: nothing is created during a render.
const profileQuery = createQuery<Profile>(async () => {
  await new Promise((resolve) => {
    return setTimeout(resolve, 1200);
  });
  return {
    name: 'Ada Lovelace',
    plan: 'Enterprise',
    fetchedAt: new Date().toLocaleTimeString(),
  };
});

export function AsyncOpenExample() {
  const { result } = useStore(resultStore);
  // The shape a real `useQuery` gives you — swap the import, keep everything below.
  const { data, isFetching, isSuccess, refetch, invalidate } = useQuery(profileQuery);

  const asyncModal = useMessageModal<void, 'confirm'>({
    id: MODAL_ID,
    // A string: the pending branch has no heading to point at, the loaded one is the fetched name.
    ariaLabel: 'Profile',
    // Awaiting here is what makes `open()` resolve with the data already in.
    prepare: async () => {
      if (!profileQuery.isCached()) {
        await refetch();
      }
    },
    render: ({ isPreparing, action }) => {
      // In both branches: the loaded one is where preparing is over, so `true` would never show.
      const axes = (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Chip
            size="small"
            label={`isPreparing: ${String(isPreparing)}`}
            color={isPreparing ? 'warning' : 'default'}
          />
          <Chip
            size="small"
            label={`isFetching: ${String(isFetching)}`}
            color={isFetching ? 'warning' : 'default'}
          />
        </Stack>
      );

      return (
        <ContentTransition
          // `prepare` runs on every open, so `isPreparing` is briefly true even on a warm cache.
          pending={isPreparing && !isSuccess}
          fallback={
            <MessageModal.DefaultContainer>
              <Stack spacing={2} sx={{ py: 3, alignItems: 'center' }}>
                <CircularProgress />
                <Typography color="text.secondary">Fetching profile…</Typography>
                {axes}
              </Stack>
            </MessageModal.DefaultContainer>
          }
        >
          <MessageModal.DefaultLayout>
            <MessageModal.Header>
              <MessageModal.Icon type="info" sx={{ mb: 0 }} />
              <Typography variant="h6">{data?.name ?? 'Profile'}</Typography>
            </MessageModal.Header>
            <MessageModal.Content>
              <Stack sx={{ gap: 1.5 }}>
                <Typography>
                  Plan: <strong>{data?.plan}</strong> — fetched at {data?.fetchedAt}
                </Typography>

                {/* Refetch here: only `isFetching` flips. The modal is already prepared. */}
                {axes}

                <Shared.Button
                  size="small"
                  loading={isFetching}
                  onClick={() => {
                    void refetch();
                  }}
                >
                  Refetch in background
                </Shared.Button>
              </Stack>
            </MessageModal.Content>
            <MessageModal.Footer>
              <Shared.Button variant="contained" {...action('confirm')}>
                OK
              </Shared.Button>
            </MessageModal.Footer>
          </MessageModal.DefaultLayout>
        </ContentTransition>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} modals={asyncModal.Modal}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Shared.Button
          variant="contained"
          size="small"
          onClick={async () => {
            const [, closeResult] = await asyncModal.openAndWait();
            resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
          }}
        >
          Open
        </Shared.Button>
        <Shared.Button
          size="small"
          disabled={!isSuccess}
          onClick={() => {
            invalidate();
            resultStore.setResult('Cache dropped — the next open loads again');
          }}
        >
          Invalidate cache
        </Shared.Button>
      </Stack>
    </ExampleLayout>
  );
}
