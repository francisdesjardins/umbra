import { useModal } from '../../use-modal.js';

/**
 * A contained dialog opening over content that is already in its host.
 *
 * This is the ordinary shape — a detail pane sliding over the list it belongs to — and the one
 * the "provide a sized, positioned host" rule does not say anything about: the host the library
 * renders is a `height: 100%` block, so in normal flow it lands *after* whatever it was meant to
 * cover and pushes it out of a fixed-height box.
 *
 * The list below is deliberately laid out in the ordinary way (in flow), because that is what a
 * caller writes before they know otherwise.
 */
export function ContainedOverlayHarness() {
  const { open, isOpen, Modal } = useModal<void, 'close'>({
    id: 'contained-overlay',
    nonModal: true,
    portal: false,
    render: ({ handle }) => {
      return (
        <div
          data-testid="overlay-panel"
          style={{ height: '100%', width: '60%', marginLeft: 'auto', background: 'Canvas' }}
        >
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close panel
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Contained
      </button>
      <span data-testid="overlay-is-open">{isOpen ? 'open' : 'closed'}</span>
      {/* The host region: sized and positioned, as the contract requires. */}
      <div
        data-testid="overlay-host"
        style={{ position: 'relative', height: 200, overflow: 'hidden', border: '1px solid' }}
      >
        {/* Fills the region, the way a list inside a card does — which is when the host block
            added after it has nowhere left to go. */}
        <div data-testid="overlay-row" style={{ height: '100%' }}>
          A row the panel is supposed to cover
        </div>
        {Modal}
      </div>
    </div>
  );
}
