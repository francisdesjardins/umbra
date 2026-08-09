import { useModal } from '../../../react/use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * Scroll-lock compensation harness.
 *
 * The page is deliberately taller than the viewport so a classic scrollbar is present, and
 * carries a right-aligned marker: hiding `overflow` without compensating the scrollbar width
 * widens the viewport and shifts that marker — the ~15px "jump" a modal used to cause.
 *
 * Also renders a `position: fixed` bar that opts into `--dialog-scrollbar-width`, proving the
 * published custom property is usable from user-land (the library never touches fixed elements
 * itself).
 */
export function ScrollLockHarness() {
  const { Modal, dialogManager } = useModal<void, 'done'>({
    id: 'scroll-lock-modal',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Blocking modal</p>
          {/* Top-layer rule: a control usable while this modal is open must live inside the
            render callback, since the native backdrop swallows clicks outside the dialog. */}
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

  // Second blocking modal, stacked on the first: both lock, but the compensation must be
  // applied exactly once.
  const { Modal: Modal2 } = useModal<void, 'done'>({
    id: 'scroll-lock-modal-2',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Second blocking modal</p>
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
      {/* Taller than any test viewport → guarantees a scrollbar. */}
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

        {/* User-land fixed element opting into the published compensation. */}
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
