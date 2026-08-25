import { useState } from 'react';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/**
 * An action settling in a panel that is not in front — `FocusUnderAnotherDialogHarness`'s claim, in
 * the arrangement Chromium can answer. Behind a modal dialog everything is inert, so the restore's
 * `focus()` is a silent no-op and the rule seems to hold either way; WebKit does not make it one,
 * which is how CI found the missing guard. Two non-modal panels take the platform out of it.
 */
export function RestoreNotInFrontHarness() {
  const [settled, setSettled] = useState(0);

  const front = useDialog<void, 'close'>({
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

  const behind = useDialog<void, 'save'>({
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
      {behind.Dialog}
      {front.Dialog}
    </div>
  );
}
