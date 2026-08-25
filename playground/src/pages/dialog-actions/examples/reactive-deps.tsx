import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createImmerStore } from '@/shared/lib/immer-store';
import { AppButton } from '@/shared/ui/AppButton';
import type { ReactNode } from 'react';
import { useMessageDialog } from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';

export const MODAL_ID = 'reactive-demo';

// ── Module-level store ────────────────────────────────────────────────────

type Severity = 'info' | 'warning' | 'error';

type ReactiveState = { count: number; message: string; severity: Severity };

const INITIAL_STATE: ReactiveState = {
  count: 0,
  message: 'Initial message',
  severity: 'info',
};

const reactiveStore = createImmerStore(INITIAL_STATE, {
  builder: (api) => {
    return {
      reset() {
        api.reset();
      },
      setCount(count: number) {
        api.update((draft) => {
          draft.count = count;
        });
      },
      incrementCount() {
        api.update((draft) => {
          draft.count += 1;
        });
      },
      decrementCount() {
        api.update((draft) => {
          draft.count -= 1;
        });
      },
      setMessage(message: string) {
        api.update((draft) => {
          draft.message = message;
        });
      },
      setSeverity(severity: 'info' | 'warning' | 'error') {
        api.update((draft) => {
          draft.severity = severity;
        });
      },
    };
  },
});

// ── Result store — separate from reactiveStore to avoid re-rendering LiveControls ──

const resultStore = createResultStore();

// ── Live Controls ─────────────────────────────────────────────────────────

/** A caption over its control, the shape all three columns share. */
function ControlColumn({
  caption,
  children,
}: {
  readonly caption: string;
  readonly children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--app-space-2)',
        flex: 1,
        minWidth: 140,
      }}
    >
      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>{caption}</span>
      {children}
    </div>
  );
}

function useLiveControls() {
  const { count, message, severity } = useStore(reactiveStore);

  const LiveControls = (
    <div
      style={{
        width: '100%',
        padding: 'var(--app-space-4)',
        border: '1px solid var(--dialog-border)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--app-space-3)',
      }}
    >
      <div>
        <Shared.Heading>Live Controls</Shared.Heading>
        <Shared.Hint>Change values in real-time</Shared.Hint>
      </div>

      {/* `flex-wrap`, so on a narrow dialog the columns stack instead of pushing past the edge. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--app-space-6)' }}>
        <ControlColumn caption={`Counter: ${String(count)}`}>
          <div style={{ display: 'flex', gap: 'var(--app-space-2)' }}>
            <Shared.Button
              onClick={() => {
                reactiveStore.decrementCount();
              }}
            >
              −
            </Shared.Button>
            <Shared.Button
              onClick={() => {
                reactiveStore.incrementCount();
              }}
            >
              +
            </Shared.Button>
            <Shared.Button
              onClick={() => {
                reactiveStore.setCount(0);
              }}
            >
              0
            </Shared.Button>
          </div>
        </ControlColumn>

        <ControlColumn caption="Message">
          <textarea
            value={message}
            onChange={(e) => {
              reactiveStore.setMessage(e.target.value);
            }}
            rows={2}
            style={{
              padding: 'var(--app-space-2) var(--app-space-3)',
              border: '1px solid var(--dialog-control-border)',
              borderRadius: 4,
              fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-sm)',
              background: 'inherit',
              color: 'inherit',
              resize: 'vertical',
              width: '100%',
            }}
          />
        </ControlColumn>

        <ControlColumn caption="Severity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-2)' }}>
            {(['info', 'warning', 'error'] as const).map((level) => {
              return (
                <Shared.Button
                  key={level}
                  variant={severity === level ? 'primary' : 'default'}
                  onClick={() => {
                    reactiveStore.setSeverity(level);
                  }}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Shared.Button>
              );
            })}
          </div>
        </ControlColumn>
      </div>
    </div>
  );

  return { LiveControls };
}

export function ReactiveDepsExample() {
  const { result } = useStore(resultStore);
  const { count, message, severity } = useStore(reactiveStore);

  const { LiveControls } = useLiveControls();

  const reactiveModal = useMessageDialog({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    dismissOnBackdropClick: false,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Icon variant={severity} />
            <MessageDialog.Title id={`${MODAL_ID}-title`}>
              Reactive Dependencies Demo
            </MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
              <Shared.Message>{message}</Shared.Message>
              <Shared.Alert severity={severity}>
                Counter value: <strong>{count}</strong>
              </Shared.Alert>
              <Shared.Hint>
                This modal content updates automatically when count, message, or severity change.
                Use the controls below to test reactivity!
              </Shared.Hint>

              {LiveControls}
            </div>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button
              onClick={() => {
                reactiveStore.reset();
              }}
            >
              Reset
            </Shared.Button>
            <Shared.Button {...action('cancel')}>Cancel</Shared.Button>
            <Shared.Button variant="primary" {...action('confirm')}>
              Confirm
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={reactiveModal.Dialog}>
      <AppButton
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await reactiveModal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Dialog & Test Reactivity
      </AppButton>
    </ExampleLayout>
  );
}
