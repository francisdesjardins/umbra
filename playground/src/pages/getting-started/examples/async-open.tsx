import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { ContentTransition } from '@/entities/dialog-template/ui/vanilla/shared/content/ContentTransition';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createQuery, useQuery } from '@/shared/lib/use-query';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const DIALOG_ID = 'async-open';

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

  const asyncDialog = useMessageDialog({
    id: DIALOG_ID,
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
        <Shared.Detail>
          isPreparing: <strong>{String(isPreparing)}</strong> · isFetching:{' '}
          <strong>{String(isFetching)}</strong>
        </Shared.Detail>
      );

      return (
        <ContentTransition
          // `prepare` runs on every open, so `isPreparing` is briefly true even on a warm cache.
          pending={isPreparing && !isSuccess}
          fallback={
            // The layout, not the scroll container: `DefaultLayout` is what paints the surface,
            // and a fallback shown before the content exists has nobody else to paint one.
            <MessageDialog.DefaultLayout>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'var(--app-space-4)',
                  padding: 'var(--app-space-6) 0',
                }}
              >
                <Shared.Message>Fetching profile…</Shared.Message>
                {axes}
              </div>
            </MessageDialog.DefaultLayout>
          }
        >
          <MessageDialog.DefaultLayout>
            <MessageDialog.Header>
              <MessageDialog.Icon variant="info" />
              <MessageDialog.Title>{data?.name ?? 'Profile'}</MessageDialog.Title>
            </MessageDialog.Header>
            <MessageDialog.Content>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-3)' }}>
                <Shared.Message>
                  Plan: <strong>{data?.plan}</strong> — fetched at {data?.fetchedAt}
                </Shared.Message>

                {/* Refetch here: only `isFetching` flips. The dialog is already prepared. */}
                {axes}

                <Shared.Button
                  loading={isFetching}
                  onClick={() => {
                    void refetch();
                  }}
                >
                  Refetch in background
                </Shared.Button>
              </div>
            </MessageDialog.Content>
            <MessageDialog.Footer>
              <Shared.Button variant="primary" {...action('confirm')}>
                OK
              </Shared.Button>
            </MessageDialog.Footer>
          </MessageDialog.DefaultLayout>
        </ContentTransition>
      );
    },
    onClose: (closeResult) => {
      resultStore.setResult(`Closed: ${closeResult.reason}`);
    },
  });

  return (
    <ExampleLayout result={result} dialogs={asyncDialog.Dialog}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-2)' }}>
        <AppButton
          variant="contained"
          size="small"
          onClick={async () => {
            const [, closeResult] = await asyncDialog.openAndWait();
            resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
          }}
        >
          Open
        </AppButton>
        <AppButton
          variant="outlined"
          size="small"
          disabled={!isSuccess}
          onClick={() => {
            invalidate();
            resultStore.setResult('Cache dropped — the next open loads again');
          }}
        >
          Invalidate cache
        </AppButton>
      </div>
    </ExampleLayout>
  );
}
