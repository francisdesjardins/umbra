import { useModal } from '../../react.js';
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
