import { useState } from 'react';
import { useModal } from '../../react.js';

// A modal dialog whose Escape is a *request*: the dialog reports and the state above it decides,
// as in any controlled wrapper. A dialog that closed itself would leave that boolean saying `true`,
// and the next render would put it straight back.
export function ControlledModalHarness() {
  const [requests, setRequests] = useState(0);
  const [allow, setAllow] = useState(false);

  const modal = useModal({
    id: 'controlled-modal',
    ariaLabel: 'A controlled modal',
    onDismissRequest: () => {
      setRequests((count) => {
        return count + 1;
      });
      // The owner acts only once it has decided to, which is the whole point of the two steps.
      if (allow) {
        modal.handle.close('dismiss');
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
      <button
        data-testid="open"
        onClick={() => {
          void modal.open();
        }}
        type="button"
      >
        Open
      </button>
      {modal.Modal}
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

  const modal = useModal({
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
          void modal.open();
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
      {modal.Modal}
    </div>
  );
}
