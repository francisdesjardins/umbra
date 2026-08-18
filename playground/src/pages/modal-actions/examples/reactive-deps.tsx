import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/vanilla/message-modal';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import { createResultStore } from '@/shared/lib/createResultStore';
import { createImmerStore } from '@/shared/lib/immer-store';
import Button from '@mui/material/Button';
import type { ReactNode } from 'react';
import { useMessageModal } from 'umbra/react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
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
        padding: 16,
        border: '1px solid var(--modal-border)',
        borderRadius: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <Shared.Heading>Live Controls</Shared.Heading>
        <Shared.Hint>Change values in real-time</Shared.Hint>
      </div>

      {/* `flex-wrap`, so on a narrow dialog the columns stack instead of pushing past the edge. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <ControlColumn caption={`Counter: ${String(count)}`}>
          <div style={{ display: 'flex', gap: 8 }}>
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
              padding: '8px 12px',
              border: '1px solid var(--modal-control-border)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

  const reactiveModal = useMessageModal<void, 'cancel' | 'confirm'>({
    id: MODAL_ID,
    ariaLabelledBy: `${MODAL_ID}-title`,
    dismissOnBackdropClick: false,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <MessageModal.Icon variant={severity} />
            <MessageModal.Title id={`${MODAL_ID}-title`}>
              Reactive Dependencies Demo
            </MessageModal.Title>
          </MessageModal.Header>
          <MessageModal.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          </MessageModal.Content>
          <MessageModal.Footer>
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
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  return (
    <ExampleLayout result={result} modals={reactiveModal.Modal}>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          const [, closeResult] = await reactiveModal.openAndWait();
          resultStore.setResult(`Closed: ${closeResult?.reason ?? 'unknown'}`);
        }}
      >
        Open Modal & Test Reactivity
      </Button>
    </ExampleLayout>
  );
}
