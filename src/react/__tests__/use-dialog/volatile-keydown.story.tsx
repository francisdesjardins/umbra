import { useState } from 'react';
import { Key } from '../../../utils/keys.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A dialog whose `onKeyDown` is an inline arrow — a new function every render, the normal spelling —
 * with an action that renders while it runs. The regression fixture for the director's granularity:
 * `focus.sync` remembers for one attachment that an action is running, and that memory recognises
 * running → idle and returns focus to the button. A director keyed on the union of every step's
 * inputs would rebuild the attachment on any identity change, wiping the memory mid-action.
 */
export function VolatileKeyDownHarness() {
  const [keys, setKeys] = useState(0);
  const [settled, setSettled] = useState(0);

  const { open, isVisible, Dialog } = useDialog<void, 'save'>({
    id: 'volatile-keydown',
    // A fresh closure every render over state it reads, so React cannot hoist it.
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === Key.ArrowDown) {
        setKeys(keys + 1);
      }
    },
    render: ({ action }) => {
      const save = action('save', {
        focusOnOpen: true,
        onAction: async () => {
          // Two renders while the action runs, each handing `useDialog` a new `onKeyDown`.
          setKeys((n) => {
            return n + 1;
          });
          await new Promise((resolve) => {
            setTimeout(resolve, 20);
          });
          setSettled((n) => {
            return n + 1;
          });
        },
      });

      return (
        <div style={dialogStyle}>
          <button {...save} data-testid="volatile-save">
            Save
          </button>
          <span data-testid="volatile-renders">{keys}</span>
          {/* What the test waits on. Reading `data-loading` instead would be a race: a 20ms
              action can settle between two of Playwright's polls and the busy state is never
              observed — measured, on Firefox. */}
          <span data-testid="volatile-settled">{settled}</span>
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
        Open Volatile
      </button>
      <span data-testid="volatile-is-visible">{isVisible ? 'open' : 'closed'}</span>
      {Dialog}
    </div>
  );
}
