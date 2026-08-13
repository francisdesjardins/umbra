import { useState } from 'react';
import { useModal } from '../../react.js';

/**
 * A modal dialog whose Escape is a *request*.
 *
 * The owner is the `open` state here, as it is in any controlled wrapper: the dialog never closes
 * itself, it reports, and the state above it decides. That distinction is invisible in a screenshot
 * and total in behaviour — a dialog that closed itself would leave the boolean above it saying
 * `true`, and the next render would put it straight back.
 */
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

/**
 * A non-modal panel whose Escape is a request, and which may decline the press.
 *
 * Two things only this variant can show. The panel is outside the top layer, so focus is ordinary
 * and the press is made from a button *beside* it — a dialog-level listener would never hear it.
 * And declining leaves the press travelling: the window listener captures, so a press it swallows
 * is one the page never sees, and an owner that did nothing must not cost the page its keyboard.
 */
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
        // The page's own listener, standing in for everything a real application binds. It is what
        // a swallowed press costs, so it is what the decline path has to leave working.
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
