import { useEffect } from 'react';
import { Key, useModal } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A non-modal panel opening underneath a modal dialog that holds focus.
 *
 * The arrangement the fleet produces on its own: an interruption is up (a connection warning, in
 * the top layer, focused), and a route settles a side panel underneath it. The panel's opening is
 * real and wanted — what it must not do is take the keyboard from the dialog the user is looking
 * at. The panel claims `focusOnOpen` deliberately, so the test cannot pass because nothing asked
 * for focus: it passes only if the claim is refused while another dialog is in front.
 *
 * The panel is opened from inside the modal's render because the top layer swallows outside
 * clicks — the trigger is placement, not the scenario; the report's own trigger was a route.
 */
export function OpeningFocusForegroundHarness() {
  const panel = useModal<void, 'ok'>({
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

  const interruption = useModal<void, 'stay'>({
    id: 'off-interruption',
    ariaLabel: 'Interruption in front',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          {/* No `focusOnOpen` here, deliberately. A dialog that claimed one can be handed back
              exactly what it claimed; a dialog with none — which is most of them, and is the
              connection warning the report came from — needs the return to have a floor. With a
              claim on this button the test passed against a version that returned nothing. */}
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
 * Taking the focus back, in the two shapes the declining half leaves behind.
 *
 * Separate from the harness above rather than folded into it, because the two need opposite things
 * from the dialog in front: that one deliberately claims no `focusOnOpen`, so the return has to have
 * a floor, and this one *must* claim one — it is the only way to tell "handed back where focus was"
 * apart from "re-honoured the claim", which is the whole of what the precision is about.
 *
 * `behindIsModal` picks which of the two ways a dialog can end up underneath, because they exercise
 * different code and only one of them existed before:
 *
 * - `false` — a **non-modal** panel arriving under a modal dialog. The platform settles that, so
 *   nothing is re-shown and the reclaim is the only thing that can put the focus back. This is the
 *   reported case.
 * - `true` — a **modal** dialog kept underneath by a `prioritize` policy, which is the arrangement
 *   the two features produce together. Here the newcomer really does reach the top layer first and
 *   the policy lifts the front dialog back over it, so `raiseDialog` runs as well.
 *
 * The one behind opens on a **timer** rather than from a click, and that is load-bearing: a click
 * would move focus to the button that did the opening, and then "focus did not move" would be true
 * for the wrong reason. A timer is also the honest reproduction — the report's own trigger was a
 * route settling, not a press.
 */
export function ReclaimFocusHarness({ behindIsModal }: { behindIsModal: boolean }) {
  const behind = useModal<void, 'ack'>({
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

  const front = useModal<void, 'done'>({
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
