import { useState } from 'react';
import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * Pins the *paint timing* of outlet-rendered content.
 *
 * The dialog node is built by this component but rendered by the `ModalOutlet`, so it
 * reaches the DOM only once the outlet re-renders — one hop later than for a modal the
 * consumer places itself. This harness bounds that hop: content published to the outlet
 * must land within the same frame, never trailing one the user can see.
 *
 * `painted-count` records what the dialog's DOM said at the next animation frame after
 * the click — i.e. what the user was about to see. It must already match `count`.
 */
function Inner() {
  const [count, setCount] = useState(0);
  const [paintedCount, setPaintedCount] = useState('-');

  const { open, isOpen } = useModal({
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
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
