import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * A modal running a slow action, with a second modal opened over it while that action is still
 * in flight — a background save and a confirm on top of it, which is ordinary.
 *
 * Both are blocking: only a dialog in the top layer can hold focus while another is open, so
 * this is the shape where the question is even askable. When the save settles, the modal
 * underneath restores focus — and the modal in front is the one the user is actually in.
 */
export function FocusUnderAnotherModalHarness() {
  const [done, setDone] = useState(0);

  const child = useModal<void, 'close'>({
    id: 'over-modal',
    ariaLabel: 'On top',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button data-testid="over-field">Field on top</button>
          <button {...action('close')} data-testid="over-close">
            Close
          </button>
        </div>
      );
    },
  });

  const owner = useModal<void, 'save'>({
    id: 'under-modal',
    ariaLabel: 'Underneath',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('save', {
              onAction: async () => {
                await new Promise((resolve) => {
                  setTimeout(resolve, 250);
                });
                setDone((n) => {
                  return n + 1;
                });
              },
            })}
            data-testid="under-save"
          >
            Save slowly
          </button>
          {/* Not an action, so it stays clickable while the save runs. */}
          <button
            onClick={async () => {
              await child.open();
            }}
            data-testid="under-open-child"
          >
            Open the one on top
          </button>
          {child.Modal}
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await owner.open();
        }}
      >
        Open Underneath
      </button>
      <span data-testid="under-done">{done}</span>
      {owner.Modal}
    </div>
  );
}
