import { useModal } from '../../use-modal.js';

/**
 * A contained dialog opening over content already in its host — a detail pane over its list. The
 * case "provide a sized, positioned host" does not cover: the library's host is a `height: 100%`
 * block, so in normal flow it lands after what it was meant to cover and pushes it out of a
 * fixed-height box. The row below is laid out in flow, the way a caller writes it first.
 */
export function ContainedOverlayHarness() {
  const { open, isVisible, Modal } = useModal<void, 'close'>({
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
      <span data-testid="overlay-is-visible">{isVisible ? 'open' : 'closed'}</span>
      <div
        data-testid="overlay-host"
        style={{ position: 'relative', height: 200, overflow: 'hidden', border: '1px solid' }}
      >
        <div data-testid="overlay-row" style={{ height: '100%' }}>
          A row the panel is supposed to cover
        </div>
        {Modal}
      </div>
    </div>
  );
}
