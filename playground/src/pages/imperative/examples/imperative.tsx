import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { dialogManager, useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { createImmerStore } from '@/shared/lib/immer-store';

// ── Module-level store ────────────────────────────────────────────────────

const openCountStore = createImmerStore(
  { openCount: 0, result: null as string | null },
  {
    builder: ({ update }) => {
      return {
        increment() {
          update((draft) => {
            draft.openCount += 1;
          });
        },
        setResult(result: string | null) {
          update((draft) => {
            draft.result = result;
          });
        },
      };
    },
  }
);

// ── Component ──────────────────────────────────────────────────────────────

export function ImperativeExample() {
  const { openCount, result } = useStore(openCountStore);

  const dialog = useMessageDialog({
    id: 'imperative-demo',
    ariaLabelledBy: 'imperative-demo-title',
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant="success" />
            <MessageDialog.Title id="imperative-demo-title">Imperative Dialog</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Shared.Message>
                Opened via <code>dialogManager.open()</code> — no React ref or state needed.
              </Shared.Message>
              <Shared.Detail>
                State lives at module scope via <code>createStore</code>. React Compiler tracks
                dependencies automatically.
              </Shared.Detail>
              <span
                style={{
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid var(--dialog-border)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--dialog-text-secondary)',
                }}
              >
                Total opens: {openCount}
              </span>
            </div>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button
              onClick={() => {
                dialogManager.close('imperative-demo');
              }}
            >
              Close via dialogManager
            </Shared.Button>
            <Shared.Button variant="primary" {...action('confirm')}>
              Close
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
    prepare: () => {
      openCountStore.increment();
    },
    onClose: (closeResult) => {
      openCountStore.setResult(
        `Closed: ${closeResult.reason} (opened ${String(openCountStore.getSnapshot().openCount)} times)`
      );
    },
  });

  return (
    <ExampleLayout result={result} dialogs={dialog.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        onClick={() => {
          dialogManager.open('imperative-demo');
        }}
      >
        Open via dialogManager
      </AppButton>
    </ExampleLayout>
  );
}
