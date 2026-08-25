import { useState } from 'react';
import { Spinner } from '@/shared/ui/Spinner';
import { ExampleLayout } from '@/entities/example';
import * as FormDialog from '@/entities/dialog-template/ui/vanilla/form-dialog';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import { AppButton } from '@/shared/ui/AppButton';
import { useMessageDialog } from 'umbra/react';

export const DIALOG_ID = 'per-action-state';

const resultStore = createResultStore();

/** Two actions that take their time, so which one is running is a question worth asking. */
const slow = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/** The shell's spinner, taking the dialog's own primary rather than the page's — this renders
 * inside a vanilla dialog, whose palette is the template's. */
function ActionSpinner() {
  return (
    <span style={{ display: 'inline-flex', color: 'var(--color-primary)' }}>
      <Spinner size={18} />
    </span>
  );
}

/**
 * `action.isRunning(reason)` — per-action state, read away from the button that owns it. Spreading
 * an action's props gives that button `data-loading`; the header, field and notice are not that
 * button, and `hasRunningAction` only says *something* runs, not which wait this is.
 */
export function PerActionStateExample() {
  const { result } = useStore(resultStore);
  // Which handler started: `phase` says the dialog is leaving, not what it was doing.
  const [started, setStarted] = useState<'draft' | 'publish' | null>(null);

  const dialog = useMessageDialog({
    id: DIALOG_ID,
    // A string, not the heading: it is a status changing under the user, and a name must not.
    ariaLabel: 'Publish post',
    dismissOnBackdropClick: false,
    render: ({ action, hasRunningAction, phase }) => {
      // An action stops running before the exit ends, so the header needs the wait to outlive it.
      const leaving = phase === 'closing';
      const publishing = action.isRunning('publish') || (leaving && started === 'publish');
      const savingDraft = action.isRunning('draft') || (leaving && started === 'draft');

      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            {hasRunningAction || leaving ? <ActionSpinner /> : null}
            <MessageDialog.Title>
              {publishing ? 'Publishing…' : savingDraft ? 'Saving draft…' : 'Ready to publish'}
            </MessageDialog.Title>
          </MessageDialog.Header>

          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
              {/* Not an action's button: it locks for publish only, so a draft still takes edits. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-1)' }}>
                <FormDialog.Label htmlFor={`${DIALOG_ID}-note`}>Release note</FormDialog.Label>
                <textarea
                  id={`${DIALOG_ID}-note`}
                  rows={2}
                  disabled={publishing}
                  defaultValue="Ship the per-action state."
                  style={{
                    padding: 'var(--app-space-2) var(--app-space-3)',
                    border: '1px solid var(--form-control-border, var(--dialog-control-border))',
                    borderRadius: 4,
                    fontFamily: 'var(--font-family)',
                    fontSize: 'var(--font-size-base)',
                    background: 'inherit',
                    color: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>

              {publishing ? (
                <Shared.Alert severity="warning">
                  The note is locked while publishing — that is{' '}
                  <code>isRunning(&apos;publish&apos;)</code>, not the aggregate. Saving a draft
                  leaves it editable.
                </Shared.Alert>
              ) : (
                <Shared.Hint>
                  Start either action and watch the header, the field and the buttons disagree
                  usefully: every button is disabled while any action runs, but only the running one
                  names itself.
                </Shared.Hint>
              )}
            </div>
          </MessageDialog.Content>

          <MessageDialog.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              {...action('draft', async (close) => {
                setStarted('draft');
                await slow(1400);
                close();
              })}
            >
              Save draft
            </Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('publish', async (close) => {
                setStarted('publish');
                await slow(2000);
                close();
              })}
            >
              Publish
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} dialogs={dialog.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          setStarted(null);
          const [, closeResult] = await dialog.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open the publish dialog
      </AppButton>
    </ExampleLayout>
  );
}
