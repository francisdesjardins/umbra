import { useState } from 'react';
import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * The dialog node is built here but rendered by `ModalOutlet`, so it reaches the DOM one hop later.
 * `painted-count` records what the dialog's DOM said at the next animation frame after the click —
 * what the user was about to see — and it must already match `count`, never trail a visible frame.
 */
function Inner() {
  const [count, setCount] = useState(0);
  const [paintedCount, setPaintedCount] = useState('-');

  const { open, isVisible } = useModal({
    id: 'outlet-paint-timing',
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>
            count: <span data-testid="dialog-count">{count}</span>
          </p>
          <button
            onClick={() => {
              setCount((n) => {
                return n + 1;
              });
              // Runs before the browser paints the commit this click produced.
              requestAnimationFrame(() => {
                const rendered =
                  document.querySelector('[data-testid="dialog-count"]')?.textContent ?? '?';
                setPaintedCount(rendered);
              });
            }}
          >
            Increment
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
        Open Modal
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="count">{count}</span>
      <span data-testid="painted-count">{paintedCount}</span>
    </div>
  );
}

export function OutletPaintTimingHarness() {
  return (
    <ModalOutlet>
      <Inner />
    </ModalOutlet>
  );
}
