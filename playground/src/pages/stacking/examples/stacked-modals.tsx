import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/modal-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/modal-template/ui/vanilla/shared';
import * as SlideDialog from '@/entities/modal-template/ui/vanilla/slide-dialog';
import { AppButton } from '@/shared/ui/AppButton';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Key, useMessageDialog, useSlideDialog } from 'umbra/react';

export const PANEL_ID = 'stack-panel';

/** The chip the MUI `Chip` drew here: a pill of quiet text on the hover wash. */
const chipStyle: CSSProperties = {
  padding: '3px 8px',
  borderRadius: 'var(--app-radius-pill)',
  fontSize: 'var(--app-text-sm)',
  background: 'var(--app-hover)',
  color: 'var(--app-text)',
};

/**
 * Three modals of different kinds, stacked: all three declare `Enter` differently and only the
 * front one may hear it. Each renders **inside** the one below, because a top-layer dialog swallows
 * outside clicks, so every inner event bubbles through the outer ones and the library scopes it.
 */
export function StackedModalsExample() {
  const [log, setLog] = useState<string[]>([]);
  const [counts, setCounts] = useState({ panel: 0, middle: 0, inner: 0 });

  const record = (entry: string) => {
    setLog((previous) => {
      return [...previous.slice(-4), entry];
    });
  };

  const bump = (level: 'panel' | 'middle' | 'inner') => {
    setCounts((previous) => {
      return { ...previous, [level]: previous[level] + 1 };
    });
  };

  const inner = useMessageDialog({
    id: 'stack-inner',
    ariaLabel: 'Level 3',
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Title>Level 3 — message modal</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              Press <kbd>Enter</kbd>: only this level counts it. Press <kbd>Escape</kbd>: only this
              level closes.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button
              variant="primary"
              {...action('ack', {
                focusOnOpen: true,
                hotkey: Key.Enter,
                onAction: (close) => {
                  bump('inner');
                  close();
                },
              })}
            >
              Acknowledge
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
    onClose: (result) => {
      record(`level 3 closed: ${result.reason}`);
    },
  });

  const middle = useMessageDialog({
    id: 'stack-middle',
    ariaLabel: 'Level 2',
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Title>Level 2 — modal</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>
              <kbd>Enter</kbd> here means <em>save</em>. While level 3 is open it means something
              else, and this one must not hear it.
            </Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button
              onClick={async () => {
                await inner.open();
              }}
            >
              Open level 3
            </Shared.Button>
            <Shared.Button
              variant="primary"
              {...action('save', {
                hotkey: Key.Enter,
                onAction: (close) => {
                  bump('middle');
                  close();
                },
              })}
            >
              Save
            </Shared.Button>
          </MessageDialog.Footer>
          {/* Rendered here, inside level 2 — which is what makes the nesting real. */}
          {inner.Dialog}
        </MessageDialog.DefaultLayout>
      );
    },
    onClose: (result) => {
      record(`level 2 closed: ${result.reason}`);
    },
  });

  const panel = useSlideDialog({
    id: PANEL_ID,
    direction: 'right',
    ariaLabel: 'Level 1',
    render: ({ direction, action }) => {
      return (
        <SlideDialog.DefaultLayout direction={direction}>
          <SlideDialog.Header>
            <SlideDialog.Title>Level 1 — slide panel</SlideDialog.Title>
          </SlideDialog.Header>
          <SlideDialog.Content>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Shared.Message>
                Open the levels above, then press <kbd>Escape</kbd> three times. One press closes
                one modal, front to back — the counters below say which level heard what.
              </Shared.Message>
              <Shared.Button
                variant="primary"
                onClick={async () => {
                  await middle.open();
                }}
              >
                Open level 2
              </Shared.Button>
            </div>
          </SlideDialog.Content>
          <SlideDialog.Footer>
            <Shared.Button
              {...action('close', {
                hotkey: Key.Enter,
                onAction: (close) => {
                  bump('panel');
                  close();
                },
              })}
            >
              Close panel
            </Shared.Button>
          </SlideDialog.Footer>
          {middle.Dialog}
        </SlideDialog.DefaultLayout>
      );
    },
    onClose: (result) => {
      record(`level 1 closed: ${result.reason}`);
    },
  });

  return (
    <ExampleLayout result={log.at(-1) ?? null} modals={panel.Dialog}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--app-space-4)',
          width: '100%',
        }}
      >
        <AppButton
          variant="contained"
          size="small"
          onClick={async () => {
            setLog([]);
            setCounts({ panel: 0, middle: 0, inner: 0 });
            await panel.open();
          }}
        >
          Start the stack
        </AppButton>

        <div style={{ display: 'flex', gap: 'var(--app-space-2)', flexWrap: 'wrap' }}>
          <span style={chipStyle}>Enter heard by level 1: {String(counts.panel)}</span>
          <span style={chipStyle}>level 2: {String(counts.middle)}</span>
          <span style={chipStyle}>level 3: {String(counts.inner)}</span>
        </div>

        <div
          style={{
            minHeight: 96,
            padding: 'var(--app-space-3)',
            borderRadius: 'var(--app-radius)',
            border: '1px solid var(--app-divider)',
            fontFamily: 'monospace',
            // Off-scale on purpose: the log line size this box always used, kept to the letter.
            fontSize: '0.78rem',
            color: 'var(--app-text-secondary)',
          }}
        >
          {log.length === 0 ? (
            <em>Nothing closed yet.</em>
          ) : (
            log.map((entry, index) => {
              return <div key={`${entry}-${String(index)}`}>{entry}</div>;
            })
          )}
        </div>
      </div>
    </ExampleLayout>
  );
}
