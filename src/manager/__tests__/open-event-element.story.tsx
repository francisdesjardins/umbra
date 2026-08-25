import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DIALOG_OPEN_EVENT, useDialog } from '../../react.js';

/** What the last `dialog:open` carried, flattened to something a test can read off the page. */
type Seen = {
  readonly id: string;
  /** Whether the event's element is the very node the dialog rendered to. */
  readonly isTheDialog: boolean;
  /** Whether a document-wide query would have found it — false inside a shadow root. */
  readonly findableFromDocument: boolean;
};

function useOpenEventProbe(dialogId: string): Seen | null {
  const [seen, setSeen] = useState<Seen | null>(null);

  useEffect(() => {
    const onOpen = (event: DocumentEventMap[typeof DIALOG_OPEN_EVENT]) => {
      const { id, element } = event.detail;
      setSeen({
        id,
        isTheDialog: element instanceof HTMLDialogElement && element.dataset['dialogId'] === id,
        findableFromDocument: document.querySelector(`dialog[data-dialog-id="${id}"]`) !== null,
      });
    };
    document.addEventListener(DIALOG_OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener(DIALOG_OPEN_EVENT, onOpen);
    };
  }, [dialogId]);

  return seen;
}

/** A dialog in the document, where a query would have worked and the event agrees. */
export function OpenEventInDocumentHarness() {
  const seen = useOpenEventProbe('open-event-plain');
  const modal = useDialog({
    id: 'open-event-plain',
    ariaLabel: 'Plain',
    render: () => {
      return <p>Content</p>;
    },
  });

  return (
    <>
      <div data-testid="seen">{seen === null ? 'nothing' : JSON.stringify(seen)}</div>
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Dialog}
    </>
  );
}

/** The same dialog in a shadow root: `querySelector` cannot see in, but the event carries it. */
export function OpenEventInShadowHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  const seen = useOpenEventProbe('open-event-shadow');

  useEffect(() => {
    const host = hostRef.current;
    if (host !== null && host.shadowRoot === null) {
      setShadow(host.attachShadow({ mode: 'open' }));
    }
  }, []);

  const modal = useDialog({
    id: 'open-event-shadow',
    ariaLabel: 'In a shadow root',
    render: () => {
      return <p>Content</p>;
    },
  });

  return (
    <>
      <div data-testid="seen">{seen === null ? 'nothing' : JSON.stringify(seen)}</div>
      <button
        data-testid="open"
        disabled={shadow === null}
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      <div ref={hostRef} />
      {shadow !== null && createPortal(modal.Dialog, shadow)}
    </>
  );
}
