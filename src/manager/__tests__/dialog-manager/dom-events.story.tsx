import { useEffect, useState } from 'react';
import { useMessageDialog } from '../../../react/templates/use-message-dialog.js';
import { useSlideDialog } from '../../../react/templates/use-slide-dialog.js';
import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Tests that dialog:open and dialog:close CustomEvents are dispatched on document
 * with the correct detail payload. Records events as a JSON string for assertion.
 */
export function DomEventHarness() {
  const [log, setLog] = useState<string[]>([]);

  const { Modal: DialogA, dialogManager } = useDialog<void, 'ok'>({
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

  const { Modal: DialogB } = useSlideDialog<void, 'ok'>({
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

  const { Modal: DialogC, open: openMessage } = useMessageDialog<void, 'ok'>({
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
    const onOpen = (e: Event) => {
      const { id, template } = (e as CustomEvent<{ id: string; template: string }>).detail;
      setLog((prev) => {
        return [...prev, `open:${id}:${template}`];
      });
    };
    const onClose = (e: Event) => {
      const { id, template, reason } = (
        e as CustomEvent<{ id: string; template: string; reason: string }>
      ).detail;
      setLog((prev) => {
        return [...prev, `close:${id}:${template}:${reason}`];
      });
    };
    document.addEventListener('dialog:open', onOpen);
    document.addEventListener('dialog:close', onClose);
    return () => {
      document.removeEventListener('dialog:open', onOpen);
      document.removeEventListener('dialog:close', onClose);
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
      {DialogA}
      {DialogB}
      {DialogC}
    </div>
  );
}
