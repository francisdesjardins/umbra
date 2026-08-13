import { useState } from 'react';
import { Key } from '../../../utils/keys.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * A modal whose `onKeyDown` is an inline arrow — a new function on every render — with an action
 * that renders while it runs.
 *
 * **The regression fixture for the director's granularity.** `focus.sync` remembers, for the life
 * of one attachment, that an action is running; that memory is what recognises the running → idle
 * transition and gives focus back to the button that ran it. A director keyed on the union of
 * every step's inputs would rebuild that attachment whenever *any* option changed identity — and
 * `onKeyDown` written this way changes on every render, while an action starting is itself a
 * render. The memory would be wiped mid-action, the settle would go unrecognised, and focus would
 * be left on the `<dialog>` instead of on the button.
 *
 * Written the way an application writes it, deliberately: an inline arrow is the normal spelling,
 * so the hazard is the default case rather than an exotic one. `modal-director.test.ts` states the
 * same rule as a property of the step table; this is it happening to a user.
 */
export function VolatileKeyDownHarness() {
  const [keys, setKeys] = useState(0);
  const [settled, setSettled] = useState(0);

  const { open, isVisible, Modal } = useModal<void, 'save'>({
    id: 'volatile-keydown',
    // A fresh closure every render, over state it actually reads — so React cannot hoist it and
    // the identity really does change.
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === Key.ArrowDown) {
        setKeys(keys + 1);
      }
    },
    render: ({ action }) => {
      const save = action('save', {
        focusOnOpen: true,
        onAction: async () => {
          // Two renders while the action runs: one from `hasRunningAction` flipping, one from
          // this. Each hands `useModal` a new `onKeyDown`.
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
      {Modal}
    </div>
  );
}
