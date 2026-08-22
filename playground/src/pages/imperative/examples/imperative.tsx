import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { AppButton } from '@/shared/ui/AppButton';
import { dialogManager, useMessageModal } from 'umbra/react';
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

  const modal = useMessageModal({
    id: 'imperative-demo',
    ariaLabelledBy: 'imperative-demo-title',
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant="success" />
            <MessageModal.Title id="imperative-demo-title">Imperative Modal</MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
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
                  border: '1px solid var(--modal-border)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--modal-text-secondary)',
                }}
              >
                Total opens: {openCount}
              </span>
            </div>
          </MessageModal.Content>
          <MessageModal.Footer>
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
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
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
    <ExampleLayout result={result} modals={modal.Modal}>
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
