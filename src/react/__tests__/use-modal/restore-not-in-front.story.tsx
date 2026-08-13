import { useState } from 'react';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * An action settling in a panel that is **not** the one in front.
 *
 * The same claim as `FocusUnderAnotherModalHarness` — a settling action has no claim on the keyboard
 * when the user is looking at something else — asked in the one arrangement where **Chromium can
 * answer it**. There, a modal dialog renders everything behind it inert, so the restore's `focus()`
 * is a silent no-op and the rule appears to hold whether or not the library implements it. WebKit
 * does not make it a no-op, which is how CI found the missing guard: the same assertion, green on one
 * engine and red on another.
 *
 * Two **non-modal** panels take the platform out of it. Neither is inert, so a restore that failed to
 * check whether it is in front really does steal focus, on every engine — and the test fails without
 * the guard rather than only on Safari.
 */
export function RestoreNotInFrontHarness() {
  const [settled, setSettled] = useState(0);

  const front = useModal<void, 'close'>({
    id: 'restore-front-panel',
    ariaLabel: 'Front panel',
    nonModal: true,
    portal: true,
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Front panel</p>
          <button data-testid="front-field">Field in front</button>
        </div>
      );
    },
  });

  const behind = useModal<void, 'save'>({
    id: 'restore-behind-panel',
    ariaLabel: 'Panel behind',
    nonModal: true,
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <p>Panel behind</p>
          <button
            data-testid="behind-save"
            {...action('save', {
              onAction: async () => {
                // Long enough to still be in flight when the panel in front opens and takes focus.
                await new Promise((resolve) => {
                  setTimeout(resolve, 150);
                });
                setSettled((count) => {
                  return count + 1;
                });
              },
            })}
          >
            Save
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open-behind"
        onClick={() => {
          void behind.open();
        }}
      >
        Open the panel behind
      </button>
      <button
        data-testid="open-front"
        onClick={() => {
          void front.open();
        }}
      >
        Open the panel in front
      </button>
      <span data-testid="settled">{settled}</span>
      {behind.Modal}
      {front.Modal}
    </div>
  );
}
