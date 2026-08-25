import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/modal-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
import { useState } from 'react';
import { useMessageDialog } from 'umbra/react';
import type { DialogFailure } from 'umbra/react';

export const MODAL_ID = 'prepare-failure';

const resultStore = createResultStore();

/**
 * The other half of `Async Open`: the same card when the fetch throws. Both openings run the same
 * path — the dialog is on screen when `prepare` runs, `isPreparing` settles either way, `aria-busy`
 * returns to `false` — so without `onError` a failed open just looks empty. `onError` reports
 * rather than vetoes, so the failure is held in component state and rendered here.
 */
export function PrepareFailureExample() {
  const { result } = useStore(resultStore);
  const [shouldFail, setShouldFail] = useState(true);
  const [failure, setFailure] = useState<DialogFailure | null>(null);

  const modal = useMessageDialog({
    id: MODAL_ID,
    ariaLabel: 'Profile',
    prepare: async () => {
      await new Promise((resolve) => {
        return setTimeout(resolve, 600);
      });
      if (shouldFail) {
        throw new Error('The profile service did not answer.');
      }
    },
    // `DialogFailure` is a root export, so a handler can live outside the call; `source` is a closed
    // union, so a new one is a compile error rather than a string compare that stops matching.
    onError: (reported) => {
      setFailure(reported);
    },
    render: ({ isPreparing, action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant={failure ? 'error' : 'info'} />
            <MessageDialog.Title>Profile</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-3)' }}>
              {isPreparing ? (
                <Shared.Detail>Fetching profile…</Shared.Detail>
              ) : failure ? (
                <Shared.Alert title="Error" severity="error">
                  {failure.error.message}
                </Shared.Alert>
              ) : (
                <Shared.Message>Ada Lovelace — Enterprise</Shared.Message>
              )}
              <Shared.Hint>
                {failure
                  ? `Reported from ${failure.source}. Without onError this dialog would sit here looking loaded.`
                  : 'Nothing failed. The same open, with the switch off.'}
              </Shared.Hint>
            </div>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button variant="primary" {...action('close')}>
              Close
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
    <ExampleLayout result={result} modals={modal.Modal}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--app-space-2)',
          alignItems: 'center',
        }}
      >
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            setFailure(null);
            void modal.open();
          }}
        >
          Open
        </AppButton>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--app-space-2)',
            cursor: 'pointer',
            minHeight: 'var(--app-space-6)',
          }}
        >
          <input
            type="checkbox"
            checked={shouldFail}
            onChange={(event) => {
              setShouldFail(event.target.checked);
            }}
            style={{ accentColor: 'var(--app-flame)' }}
          />
          Make the fetch throw
        </label>
      </div>
    </ExampleLayout>
  );
}
