import { ExampleLayout } from '@/entities/example';
import * as MessageDialog from '@/entities/dialog-template/ui/vanilla/message-dialog';
import * as Shared from '@/entities/dialog-template/ui/vanilla/shared';
import * as SlideDialog from '@/entities/dialog-template/ui/vanilla/slide-dialog';
import { AppButton } from '@/shared/ui/AppButton';
import {
  DIALOG_CLOSE_EVENT,
  DIALOG_OPEN_EVENT,
  useMessageDialog,
  useSlideDialog,
} from 'umbra/react';
import { useStore } from '@/shared/lib/use-store';
import { createImmerStore } from '@/shared/lib/immer-store';
import { useEffect } from 'react';

const store = createImmerStore(
  { eventLog: [] as string[] },
  {
    builder: ({ update }) => {
      return {
        addEvent(entry: string) {
          update((d) => {
            d.eventLog = [entry, ...d.eventLog.slice(0, 9)];
          });
        },
      };
    },
  }
);

const ALERT_ID = 'dom-events-alert';
const PANEL_ID = 'dom-events-panel';

export function DomEventsExample() {
  const { eventLog } = useStore(store);

  const alert = useMessageDialog({
    id: ALERT_ID,
    ariaLabelledBy: `${ALERT_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageDialog.DefaultLayout>
          <MessageDialog.Header>
            <MessageDialog.Title id={`${ALERT_ID}-title`}>Message Dialog</MessageDialog.Title>
          </MessageDialog.Header>
          <MessageDialog.Content>
            <Shared.Message>A regular dialog — type will be &quot;dialog&quot;.</Shared.Message>
          </MessageDialog.Content>
          <MessageDialog.Footer>
            <Shared.Button variant="primary" {...action('ok')}>
              OK
            </Shared.Button>
          </MessageDialog.Footer>
        </MessageDialog.DefaultLayout>
      );
    },
  });

  const panel = useSlideDialog({
    id: PANEL_ID,
    direction: 'right',
    ariaLabelledBy: `${PANEL_ID}-title`,
    render: ({ action }) => {
      return (
        <SlideDialog.DefaultLayout direction="right">
          <SlideDialog.Header>
            <SlideDialog.Title id={`${PANEL_ID}-title`}>Slide Panel</SlideDialog.Title>
          </SlideDialog.Header>
          <SlideDialog.Content>
            <Shared.Message>A slide dialog — type will be &quot;slide&quot;.</Shared.Message>
          </SlideDialog.Content>
          <SlideDialog.Footer>
            <Shared.Button variant="primary" {...action('ok')}>
              Close
            </Shared.Button>
          </SlideDialog.Footer>
        </SlideDialog.DefaultLayout>
      );
    },
  });

  useEffect(() => {
    // These fire on `document` for *every* dialog, whichever manager raised it, so an analytics
    // listener needs no import. The filter is a demo concession; an app would not filter.
    const OWN = new Set([ALERT_ID, PANEL_ID]);

    // No cast: the library augments `DocumentEventMap`, so `e.detail` is already typed.
    const onOpen = (e: DocumentEventMap['dialog:open']) => {
      const { id, template, openedAt } = e.detail;
      if (!OWN.has(id)) {
        return;
      }
      const ts = new Date(openedAt).toLocaleTimeString();
      store.addEvent(`[${ts}] dialog:open  id=${id}  template=${template}`);
    };

    const onClose = (e: DocumentEventMap['dialog:close']) => {
      const { id, template, reason, openedAt } = e.detail;
      if (!OWN.has(id)) {
        return;
      }
      const duration = Date.now() - openedAt;
      const ts = new Date().toLocaleTimeString();
      store.addEvent(
        `[${ts}] dialog:close id=${id}  template=${template}  reason=${reason ?? '—'}  open=${String(duration)}ms`
      );
    };

    document.addEventListener(DIALOG_OPEN_EVENT, onOpen);
    document.addEventListener(DIALOG_CLOSE_EVENT, onClose);
    return () => {
      document.removeEventListener(DIALOG_OPEN_EVENT, onOpen);
      document.removeEventListener(DIALOG_CLOSE_EVENT, onClose);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--app-space-4)' }}>
      <div
        style={{
          padding: 'var(--app-space-4)',
          background: 'var(--app-paper)',
          borderRadius: 'var(--app-radius)',
          border: '1px solid var(--app-divider)',
          fontFamily: 'monospace',
          fontSize: 'var(--app-text-sm)',
          maxHeight: 160,
          overflow: 'auto',
        }}
      >
        {eventLog.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: 'var(--app-text-md)',
              lineHeight: 1.43,
              color: 'var(--app-text-secondary)',
            }}
          >
            No events yet — open a dialog to see <code>dialog:open</code> /{' '}
            <code>dialog:close</code> fire on <code>document</code>
          </p>
        ) : (
          eventLog.map((entry, i) => {
            return <div key={i}>{entry}</div>;
          })
        )}
      </div>

      <ExampleLayout
        dialogs={
          <>
            {alert.Dialog}
            {panel.Dialog}
          </>
        }
        result={null}
      >
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            return void alert.open();
          }}
        >
          Open Dialog
        </AppButton>
        <AppButton
          variant="contained"
          size="small"
          onClick={() => {
            return void panel.open();
          }}
        >
          Open Slide Panel
        </AppButton>
      </ExampleLayout>
    </div>
  );
}
