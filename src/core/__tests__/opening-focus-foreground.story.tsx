import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Key, useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A non-modal panel opening underneath a modal that holds focus. The panel claims `focusOnOpen`
 * deliberately, so the test cannot pass because nothing asked for focus. It opens from inside the
 * modal's render only because the top layer swallows outside clicks — the trigger is placement.
 */
export function OpeningFocusForegroundHarness() {
  const panel = useDialog<void, 'ok'>({
    id: 'off-panel',
    nonModal: true,
    ariaLabel: 'Panel underneath',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('ok', { focusOnOpen: true })} data-testid="off-panel-button">
            Panel action
          </button>
        </div>
      );
    },
  });

  const interruption = useDialog<void, 'stay'>({
    id: 'off-interruption',
    ariaLabel: 'Interruption in front',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          {/* No `focusOnOpen`, deliberately: a dialog with none needs the return to have a floor.
              With a claim here the test passed against a version that returned nothing. */}
          <button {...action('stay')} data-testid="off-stay">
            Stay
          </button>
          <button
            data-testid="off-open-panel"
            onClick={() => {
              void panel.open();
            }}
            type="button"
          >
            Open the panel underneath
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="off-open-interruption"
        onClick={() => {
          void interruption.open();
        }}
        type="button"
      >
        Open the interruption
      </button>
      {/* The panel alone — reachable because a non-modal open leaves the page clickable. */}
      <button
        data-testid="off-open-panel-alone"
        onClick={() => {
          void panel.open();
        }}
        type="button"
      >
        Open the panel alone
      </button>
      {interruption.Modal}
      {panel.Modal}
    </div>
  );
}

/**
 * Taking the focus back, in the two shapes the declining half leaves behind. Separate from the
 * harness above because the two need opposite things: that one claims no `focusOnOpen`, this one
 * *must* — the only way to tell "handed back where focus was" from "re-honoured the claim".
 * `behindIsModal` picks how the dialog ends up underneath: `false` is a non-modal panel the
 * platform settles, so the reclaim alone restores focus (the reported case); `true` is a modal kept
 * down by `prioritize`, where the newcomer reaches the top layer first and `raiseDialog` runs too.
 * It opens on a **timer** — a click would move focus to the opener and pass for the wrong reason.
 */
export function ReclaimFocusHarness({ behindIsModal }: { behindIsModal: boolean }) {
  const behind = useDialog<void, 'ack'>({
    id: 'rf-behind',
    ariaLabel: 'The one behind',
    ...(behindIsModal ? {} : { nonModal: true }),
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('ack', { focusOnOpen: true, hotkey: Key.Enter })}
            data-testid="rf-behind-claimed"
          >
            Acknowledge
          </button>
        </div>
      );
    },
  });

  const front = useDialog<void, 'done'>({
    id: 'rf-front',
    ariaLabel: 'The one in front',
    render: ({ action, handle }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('done', { focusOnOpen: true })} data-testid="rf-front-claimed">
            Done
          </button>
          {/* Where focus will actually be when the stack moves. A caret in a field is the case that
              makes the difference visible: re-honouring the claim above would lose it. */}
          <input data-testid="rf-front-input" aria-label="Notes" />
          <button
            data-testid="rf-schedule"
            onClick={() => {
              setTimeout(() => {
                behind.dialogManager.open('rf-behind');
              }, 120);
            }}
            type="button"
          >
            Let something open behind
          </button>
          <button
            data-testid="rf-close-front"
            onClick={() => {
              handle.close('done');
            }}
            type="button"
          >
            Close the front one
          </button>
        </div>
      );
    },
  });

  const { dialogManager } = front;
  useEffect(() => {
    if (!behindIsModal) {
      return undefined;
    }
    // Two modal dialogs, so nothing but a policy can keep one of them underneath.
    return dialogManager.prioritize((modal) => {
      return modal.id === 'rf-front' ? 10 : 0;
    });
  }, [behindIsModal, dialogManager]);

  return (
    <div>
      <button
        data-testid="rf-open-front"
        onClick={() => {
          void front.open();
        }}
        type="button"
      >
        Open the front one
      </button>
      {front.Modal}
      {behind.Modal}
    </div>
  );
}

/**
 * A modal claiming nothing with a non-modal panel opening underneath — the shape a shell produces:
 * the panel's `show()` takes the keyboard, which `reclaimFocus` exists to undo. **Neither button
 * claims `focusOnOpen`**, which pins the defect: a reclaim aimed only at that marker falls through
 * to `dialog.focus()`, which an open `<dialog>` refuses, leaving the keyboard on `<body>`.
 */
export function ReclaimWithoutClaimHarness() {
  const modal = useDialog({
    id: 'reclaim-no-claim',
    ariaLabel: 'A modal that claims no opening focus',
    render: ({ action }) => {
      return (
        <>
          <button {...action('cancel')} data-testid="claimless-cancel" type="button">
            Cancel
          </button>
          <button {...action('confirm')} data-testid="claimless-confirm" type="button">
            Confirm
          </button>
        </>
      );
    },
  });

  const panel = useDialog({
    id: 'reclaim-panel',
    nonModal: true,
    ariaLabel: 'A panel opening underneath',
    render: () => {
      return (
        <button data-testid="panel-button" type="button">
          In the panel
        </button>
      );
    },
  });

  return (
    <>
      <button
        data-testid="open-both"
        onClick={() => {
          void modal.open().then(() => {
            return panel.open();
          });
        }}
        type="button"
      >
        Open the modal, then the panel underneath
      </button>
      {modal.Modal}
      {panel.Modal}
    </>
  );
}

/**
 * The same arrangement in a **shadow root**. The floor focuses a candidate then asks who holds it;
 * asked of `document` a shadow root answers with the *host*, so a candidate that took focus fails
 * and the scan walks on to the dialog's **last** control. Two buttons is the smallest witness.
 */
export function ShadowReclaimWithoutClaimHarness() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null || host.shadowRoot !== null) {
      return;
    }
    setShadow(host.attachShadow({ mode: 'open' }));
  }, []);

  const modal = useDialog({
    id: 'shadow-reclaim-no-claim',
    ariaLabel: 'A modal in a shadow root that claims no opening focus',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button {...action('cancel')} data-testid="shadow-claimless-cancel" type="button">
            Cancel
          </button>
          <button {...action('confirm')} data-testid="shadow-claimless-confirm" type="button">
            Confirm
          </button>
        </div>
      );
    },
  });

  const panel = useDialog({
    id: 'shadow-reclaim-panel',
    nonModal: true,
    ariaLabel: 'A panel opening underneath, in the same root',
    render: () => {
      return (
        <button data-testid="shadow-panel-button" type="button">
          In the panel
        </button>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="shadow-open-both"
        onClick={() => {
          void modal.open().then(() => {
            return panel.open();
          });
        }}
        type="button"
      >
        Open the modal, then the panel underneath
      </button>
      <div data-testid="shadow-reclaim-host" ref={hostRef} />
      {/* Both dialogs share one root, which is the shape a widget mounted into a shadow root
          takes: the panel's `show()` steals the keyboard from inside the same tree the modal's
          reclaim has to search. */}
      {shadow !== null && createPortal(modal.Modal, shadow)}
      {shadow !== null && createPortal(panel.Modal, shadow)}
    </div>
  );
}
