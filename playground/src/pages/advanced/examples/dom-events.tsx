import { ExampleLayout } from '@/entities/example';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { Box, Stack, Typography } from '@mui/material';
import { MODAL_CLOSE_EVENT, MODAL_OPEN_EVENT, useMessageModal, useSlideModal } from 'umbra/react';
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

  const alert = useMessageModal<void, 'ok'>({
    id: ALERT_ID,
    ariaLabelledBy: `${ALERT_ID}-title`,
    render: ({ action }) => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Typography id={`${ALERT_ID}-title`} variant="h6">
              Message Modal
            </Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Typography>A regular modal — type will be &quot;modal&quot;.</Typography>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...action('ok')}>
              OK
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const panel = useSlideModal<void, 'ok'>({
    id: PANEL_ID,
    direction: 'right',
    ariaLabelledBy: `${PANEL_ID}-title`,
    render: ({ action }) => {
      return (
        <SlideModal.DefaultLayout direction="right">
          <SlideModal.Header>
            <SlideModal.Title id={`${PANEL_ID}-title`}>Slide Panel</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Typography>A slide modal — type will be &quot;slide&quot;.</Typography>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="contained" {...action('ok')}>
              Close
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
  });

  useEffect(() => {
    // These fire on `document` for *every* modal, whichever manager raised it, so an analytics
    // listener needs no import. The filter is a demo concession; an app would not filter.
    const OWN = new Set([ALERT_ID, PANEL_ID]);

    // No cast: the library augments `DocumentEventMap`, so `e.detail` is already typed.
    const onOpen = (e: DocumentEventMap['modal:open']) => {
      const { id, template, openedAt } = e.detail;
      if (!OWN.has(id)) {
        return;
      }
      const ts = new Date(openedAt).toLocaleTimeString();
      store.addEvent(`[${ts}] modal:open  id=${id}  template=${template}`);
    };

    const onClose = (e: DocumentEventMap['modal:close']) => {
      const { id, template, reason, openedAt } = e.detail;
      if (!OWN.has(id)) {
        return;
      }
      const duration = Date.now() - openedAt;
      const ts = new Date().toLocaleTimeString();
      store.addEvent(
        `[${ts}] modal:close id=${id}  template=${template}  reason=${reason ?? '—'}  open=${String(duration)}ms`
      );
    };

    document.addEventListener(MODAL_OPEN_EVENT, onOpen);
    document.addEventListener(MODAL_CLOSE_EVENT, onClose);
    return () => {
      document.removeEventListener(MODAL_OPEN_EVENT, onOpen);
      document.removeEventListener(MODAL_CLOSE_EVENT, onClose);
    };
  }, []);

  return (
    <Stack sx={{ gap: 2 }}>
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          maxHeight: 160,
          overflow: 'auto',
        }}
      >
        {eventLog.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No events yet — open a modal to see <code>modal:open</code> / <code>modal:close</code>{' '}
            fire on <code>document</code>
          </Typography>
        ) : (
          eventLog.map((entry, i) => {
            return <div key={i}>{entry}</div>;
          })
        )}
      </Box>

      <ExampleLayout
        modals={
          <>
            {alert.Modal}
            {panel.Modal}
          </>
        }
        result={null}
      >
        <Shared.Button
          variant="contained"
          size="small"
          onClick={() => {
            return void alert.open();
          }}
        >
          Open Modal
        </Shared.Button>
        <Shared.Button
          variant="outlined"
          size="small"
          onClick={() => {
            return void panel.open();
          }}
        >
          Open Slide Panel
        </Shared.Button>
      </ExampleLayout>
    </Stack>
  );
}
