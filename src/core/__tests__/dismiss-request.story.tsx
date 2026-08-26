import { useState } from 'react';
import { useDialog } from '../../react.js';
import type { DismissCause } from '../../react.js';

// A modal dialog whose dismissals are *requests*: the dialog reports and the state above it
// decides, as in any controlled wrapper. A dialog that closed itself would leave that boolean
// saying `true`, and the next render would put it straight back.
export function ControlledDialogHarness() {
  const [requests, setRequests] = useState(0);
  const [cause, setCause] = useState<DismissCause | ''>('');
  const [allow, setAllow] = useState(false);

  const dialog = useDialog({
    id: 'controlled',
    ariaLabel: 'A controlled dialog',
    onDismissRequest: (dismissedBy) => {
      setRequests((count) => {
        return count + 1;
      });
      // Which door, so one owner can treat them differently — Escape asks, the backdrop does not.
      setCause(dismissedBy);
      // The owner acts only once it has decided to, which is the whole point of the two steps.
      if (allow) {
        dialog.handle.close('dismiss');
      }
    },
    render: () => {
      return (
        <>
          <button data-testid="inside" type="button">
            Inside the dialog
          </button>
          {/* Inside, because `showModal()` puts the dialog in the top layer and the native
              backdrop blocks every click outside it. */}
          <button
            data-testid="allow"
            onClick={() => {
              setAllow(true);
            }}
            type="button"
          >
            Let the next one through
          </button>
        </>
      );
    },
  });

  return (
    <>
      <div data-testid="requests">{requests}</div>
      <div data-testid="cause">{cause}</div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      {dialog.Dialog}
    </>
  );
}

// A non-modal panel whose Escape is a request and which may decline. Outside the top layer, so the
// press comes from a button *beside* it, which a dialog-level listener would never hear. The window
// listener captures, so a press it swallows is one the page never sees.
export function ControlledPanelHarness() {
  const [requests, setRequests] = useState(0);
  const [declining, setDeclining] = useState(false);
  const [pageSaw, setPageSaw] = useState(0);

  const dialog = useDialog({
    id: 'controlled-panel',
    nonModal: true,
    ariaLabel: 'A controlled panel',
    onDismissRequest: () => {
      if (declining) {
        return false;
      }
      setRequests((count) => {
        return count + 1;
      });
      return true;
    },
    render: () => {
      return (
        <button data-testid="in-panel" type="button">
          In the panel
        </button>
      );
    },
  });

  return (
    <div
      data-testid="page"
      onKeyDownCapture={(event) => {
        // What a swallowed press costs, so what the decline path has to leave working.
        if (event.key === 'Escape') {
          setPageSaw((count) => {
            return count + 1;
          });
        }
      }}
    >
      <div data-testid="requests">{requests}</div>
      <div data-testid="page-saw">{pageSaw}</div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <button
        data-testid="decline"
        onClick={() => {
          setDeclining(true);
        }}
        type="button"
      >
        Decline the next one
      </button>
      <button data-testid="outside" type="button">
        Outside the panel
      </button>
      {dialog.Dialog}
    </div>
  );
}

// The door that could not be heard until every dismissal went through the same one. A non-modal
// panel outside the top layer: the pointer reaches the page underneath it, so a click there is the
// library's to notice and the owner's to answer. Left to close itself, this is the arrangement
// where a controlled surface reopens on the next render.
export function ControlledClickOutsideHarness() {
  const [causes, setCauses] = useState<DismissCause[]>([]);

  const dialog = useDialog({
    id: 'controlled-click-outside',
    nonModal: true,
    dismissOnClickOutside: true,
    ariaLabel: 'A controlled panel that hears the click outside it',
    onDismissRequest: (dismissedBy) => {
      setCauses((seen) => {
        return [...seen, dismissedBy];
      });
    },
    render: () => {
      return (
        <button data-testid="in-outside-panel" type="button">
          In the panel
        </button>
      );
    },
  });

  return (
    <>
      <div data-testid="causes">{causes.join(',')}</div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      {dialog.Dialog}
    </>
  );
}
