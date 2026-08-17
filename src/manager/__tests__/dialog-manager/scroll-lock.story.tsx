import { useModal } from '../../../react/use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Scroll-lock compensation harness: taller than the viewport so a classic scrollbar exists, with a
 * right-aligned marker that moves iff the width is not compensated (the ~15px jump). The fixed bar
 * opts into `--dialog-scrollbar-width`: user-land can use it, the library never touches it.
 */
export function ScrollLockHarness() {
  const { Modal, dialogManager } = useModal<void, 'done'>({
    id: 'scroll-lock-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Modal dialog</p>
          {/* Top-layer rule: a control usable while this modal is open lives in the render. */}
          <button
            onClick={() => {
              dialogManager.open('scroll-lock-modal-2');
            }}
          >
            Stack Second Modal
          </button>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Modal
          </button>
        </div>
      );
    },
  });

  // Stacked on the first: both lock, but the compensation must be applied exactly once.
  const { Modal: Modal2 } = useModal<void, 'done'>({
    id: 'scroll-lock-modal-2',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Second modal dialog</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Second
          </button>
        </div>
      );
    },
  });

  const { Modal: NonModal } = useModal<void, 'done'>({
    id: 'scroll-lock-non-modal',
    nonModal: true,
    // Viewport-anchored: this harness tests scroll locking, not contained positioning.
    portal: true,
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Non-modal panel</p>
          <button
            onClick={() => {
              handle.close('done');
            }}
          >
            Close Non-Modal
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <div style={{ height: '250vh' }}>
        <button
          onClick={() => {
            dialogManager.open('scroll-lock-modal');
          }}
        >
          Open Modal
        </button>
        <button
          onClick={() => {
            dialogManager.open('scroll-lock-non-modal');
          }}
        >
          Open Non-Modal
        </button>

        {/* Right-aligned in normal flow: moves iff the scrollbar width is not compensated. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span data-testid="right-marker">right</span>
        </div>

        <div
          data-testid="fixed-bar"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            paddingRight: 'var(--dialog-scrollbar-width, 0px)',
          }}
        >
          <span data-testid="fixed-marker">fixed</span>
        </div>
      </div>
      {Modal}
      {Modal2}
      {NonModal}
    </div>
  );
}
