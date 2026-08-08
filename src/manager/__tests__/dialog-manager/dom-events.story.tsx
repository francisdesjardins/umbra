import { useEffect, useState } from 'react';
import { useMessageModal } from '../../../templates/use-message-modal.js';
import { useSlideModal } from '../../../templates/use-slide-modal.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests that modal:open and modal:close CustomEvents are dispatched on document
 * with the correct detail payload. Records events as a JSON string for assertion.
 */
export function DomEventHarness() {
  const [log, setLog] = useState<string[]>([]);

  const { Modal: ModalA, dialogManager } = useModal<void, 'ok'>({
    id: 'dom-ev-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('ok');
            }}
          >
            Close Modal
          </button>
        </div>
      );
    },
  });

  const { Modal: ModalB } = useSlideModal<void, 'ok'>({
    id: 'dom-ev-slide',
    direction: 'right',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('ok');
            }}
          >
            Close Slide
          </button>
        </div>
      );
    },
  });

  const { Modal: ModalC, open: openMessage } = useMessageModal<void, 'ok'>({
    id: 'dom-ev-message',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <button
            onClick={() => {
              handle.close('ok');
            }}
          >
            Close Message
          </button>
        </div>
      );
    },
  });

  useEffect(() => {
    const prepare = (e: Event) => {
      const { id, modalType } = (e as CustomEvent<{ id: string; modalType: string }>).detail;
      setLog((prev) => {
        return [...prev, `open:${id}:${modalType}`];
      });
    };
    const onClose = (e: Event) => {
      const { id, modalType, reason } = (
        e as CustomEvent<{ id: string; modalType: string; reason: string }>
      ).detail;
      setLog((prev) => {
        return [...prev, `close:${id}:${modalType}:${reason}`];
      });
    };
    document.addEventListener('modal:open', prepare);
    document.addEventListener('modal:close', onClose);
    return () => {
      document.removeEventListener('modal:open', prepare);
      document.removeEventListener('modal:close', onClose);
    };
  }, []);

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('dom-ev-modal');
        }}
      >
        Open Modal
      </button>
      <button
        onClick={() => {
          dialogManager.open('dom-ev-slide');
        }}
      >
        Open Slide
      </button>
      <button
        onClick={() => {
          void openMessage();
        }}
      >
        Open Message
      </button>
      <span data-testid="dom-events">{log.join(',')}</span>
      {ModalA}
      {ModalB}
      {ModalC}
    </div>
  );
}
