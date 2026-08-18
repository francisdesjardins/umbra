import { ExampleLayout } from '@/entities/example';
import * as FormModal from '@/entities/modal-template/ui/vanilla/form-modal';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { useStore } from '@/shared/lib/use-store';
import Button from '@mui/material/Button';
import { useMessageModal } from 'umbra/react';

export const MODAL_ID = 'per-action-state';

const resultStore = createResultStore();

/** Two actions that take their time, so which one is running is a question worth asking. */
const slow = (ms: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/** An SMIL spinner: rotation the markup carries itself, where a component library ships a widget. */
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden style={{ width: 18, height: 18, flexShrink: 0 }}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeDasharray="42 18"
      />
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="0.8s"
        repeatCount="indefinite"
      />
    </svg>
  );
}

/**
 * `action.isRunning(reason)` — per-action state, read away from the button that owns it. Spreading
 * an action's props gives that button `data-loading`; the header, field and notice are not that
 * button, and `hasRunningAction` only says *something* runs, not which wait this is.
 */
export function PerActionStateExample() {
  const { result } = useStore(resultStore);

  const modal = useMessageModal<void, 'draft' | 'publish' | 'cancel'>({
    id: MODAL_ID,
    // A string, not the heading: it is a status changing under the user, and a name must not.
    ariaLabel: 'Publish post',
    dismissOnBackdropClick: false,
    render: ({ action, hasRunningAction }) => {
      const publishing = action.isRunning('publish');

      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            {hasRunningAction ? <Spinner /> : null}
            <MessageModal.Title>
              {publishing
                ? 'Publishing…'
                : action.isRunning('draft')
                  ? 'Saving draft…'
                  : 'Ready to publish'}
            </MessageModal.Title>
          </MessageModal.Header>

          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Not an action's button: it locks for publish only, so a draft still takes edits. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <FormModal.Label htmlFor={`${MODAL_ID}-note`}>Release note</FormModal.Label>
                <textarea
                  id={`${MODAL_ID}-note`}
                  rows={2}
                  disabled={publishing}
                  defaultValue="Ship the per-action state."
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--form-control-border, var(--modal-control-border))',
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
          </MessageModal.Content>

          <MessageModal.Footer>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button
              {...action('draft', async (close) => {
                await slow(1400);
                close();
              })}
            >
              Save draft
            </Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('publish', async (close) => {
                await slow(2000);
                close();
              })}
            >
              Publish
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={modal.Modal}>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await modal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open the publish dialog
      </Button>
    </ExampleLayout>
  );
}
