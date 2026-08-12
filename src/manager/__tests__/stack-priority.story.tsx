import { useEffect } from 'react';
import { useModal } from '../../react/use-modal.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * Two modal dialogs racing for the front, with and without a stack policy.
 *
 * The shape is the one `prioritize` exists for: an interruption is already up (`sp-warning`) when
 * something else raises a panel (`sp-panel`) — a deep link, a route, another feature that knows
 * nothing about the warning. The panel's `showModal()` lands last, so the platform paints it in
 * front and the warning ends up under its backdrop: inert, dimmed, unreadable.
 *
 * `withPolicy` is what the pair of tests turns on and off, and the `false` half is not padding — a
 * reorder that never happened and a reorder that was not needed look identical from the outside, so
 * the baseline is what proves the assertion can fail.
 *
 * Both dialogs are sized alike and a modal `<dialog>` is centred by the UA, so they overlap: the
 * tests ask `elementFromPoint` at the viewport centre which one is really in front, rather than
 * believing the library's own snapshot about it.
 *
 * The button that opens the panel is inside the warning's `render` because it has to be — a modal
 * dialog is in the top layer and swallows every click outside itself.
 */
export function StackPriorityHarness({ withPolicy }: { withPolicy: boolean }) {
  const { Modal: Panel } = useModal<void, 'close'>({
    id: 'sp-panel',
    template: 'slide',
    style: { width: 300, height: 300 },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Panel</p>
          <button
            data-testid="close-panel"
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

  const {
    Modal: Warning,
    dialogManager,
    open: openWarning,
  } = useModal<void, 'close'>({
    id: 'sp-warning',
    template: 'alert',
    style: { width: 300, height: 300 },
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Warning</p>
          <button
            data-testid="open-panel"
            onClick={() => {
              dialogManager.open('sp-panel');
            }}
          >
            Open panel
          </button>
          <button
            data-testid="acknowledge"
            onClick={() => {
              handle.close('close');
            }}
          >
            Acknowledge
          </button>
        </div>
      );
    },
  });

  useEffect(() => {
    if (!withPolicy) {
      return undefined;
    }
    // Once, at start-up, which is the whole point of the surface: one rule, installed in one place,
    // for parts of the app that never learn about each other.
    return dialogManager.prioritize((modal) => {
      return modal.template === 'alert' ? 100 : 0;
    });
  }, [withPolicy, dialogManager]);

  return (
    <div>
      <button
        data-testid="open-warning"
        onClick={() => {
          void openWarning();
        }}
      >
        Open warning
      </button>
      {Warning}
      {Panel}
    </div>
  );
}
