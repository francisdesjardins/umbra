import { ExampleLayout } from '@/entities/example/ui/ExampleLayout';
import * as MessageModal from '@/entities/modal-template/ui/mui/message-modal';
import * as Shared from '@/entities/modal-template/ui/mui/shared';
import * as SlideModal from '@/entities/modal-template/ui/mui/slide-modal';
import { Box, Stack, Typography } from '@mui/material';
import {
  MODAL_CLOSE_EVENT,
  MODAL_OPEN_EVENT,
  defineAction,
  useMessageModal,
  useModalActions,
  useSlideModal,
  useStore,
} from 'umbra/react';
import { createImmerStore } from '@/shared/lib/immer-store';
import { useEffect } from 'react';

const store = createImmerStore({ eventLog: [] as string[] }, ({ update }) => {
  return {
    addEvent(entry: string) {
      update((d) => {
        d.eventLog = [entry, ...d.eventLog.slice(0, 9)];
      });
    },
  };
});

export function DomEventsExample() {
  const { eventLog } = useStore(store);

  const alertCtrl = useModalActions({ ok: defineAction() });
  const alert = useMessageModal({
    id: 'dom-events-alert',
    actions: alertCtrl,
    render: () => {
      return (
        <MessageModal.DefaultLayout>
          <MessageModal.Header>
            <Typography variant="h6">Message Modal</Typography>
          </MessageModal.Header>
          <MessageModal.Content>
            <Typography>A regular modal — type will be &quot;modal&quot;.</Typography>
          </MessageModal.Content>
          <MessageModal.Footer>
            <Shared.Button variant="contained" {...alertCtrl.ok()}>
              OK
            </Shared.Button>
          </MessageModal.Footer>
        </MessageModal.DefaultLayout>
      );
    },
  });

  const panelCtrl = useModalActions({ ok: defineAction() });
  const panel = useSlideModal({
    id: 'dom-events-panel',
    direction: 'right',
    actions: panelCtrl,
    render: () => {
      return (
        <SlideModal.DefaultLayout direction="right">
          <SlideModal.Header>
            <SlideModal.Title>Slide Panel</SlideModal.Title>
          </SlideModal.Header>
          <SlideModal.Content>
            <Typography>A slide modal — type will be &quot;slide&quot;.</Typography>
          </SlideModal.Content>
          <SlideModal.Footer>
            <Shared.Button variant="contained" {...panelCtrl.ok()}>
              Close
            </Shared.Button>
          </SlideModal.Footer>
        </SlideModal.DefaultLayout>
      );
    },
  });

  useEffect(() => {
    // No cast: the library augments `DocumentEventMap`, so `e.detail` is already typed.
    const onOpen = (e: DocumentEventMap['modal:open']) => {
      const { id, modalType, openedAt } = e.detail;
      const ts = new Date(openedAt).toLocaleTimeString();
      store.addEvent(`[${ts}] modal:open  id=${id}  type=${modalType}`);
    };

    const onClose = (e: DocumentEventMap['modal:close']) => {
      const { id, modalType, reason, openedAt } = e.detail;
      const duration = Date.now() - openedAt;
      const ts = new Date().toLocaleTimeString();
      store.addEvent(
        `[${ts}] modal:close id=${id}  type=${modalType}  reason=${reason ?? '—'}  open=${String(duration)}ms`
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
