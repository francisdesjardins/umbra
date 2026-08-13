import { useEffect, useState } from 'react';
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

/**
 * Three modal dialogs, and a policy installed after they are already on screen.
 *
 * Two things nothing else reaches. **A plan with more than one raise in it**: with three dialogs the
 * newcomer can belong at the *bottom*, which means everything above it has to lift, and `planRaises`
 * returning two ids has until now only ever been checked as a pure function. And **installing the
 * policy late**, which is the half of `prioritize` that reorders what is already painted rather than
 * what opens next — in Node that path stops at `syncStackOrder`'s `document` guard, so a browser is
 * the only place it runs at all.
 *
 * Every open is programmatic and staggered on a timer rather than driven by a click, and that is
 * forced rather than stylistic: under a policy the dialog a test would need to click is the one the
 * policy just put *underneath*, so the top layer would swallow the press. The toggle below is on the
 * page for the same reason — the tests dispatch its click directly, since what is being measured is
 * the policy's effect on an open stack, not whether a button under a backdrop is reachable.
 */
export function MultiRaiseHarness() {
  const [policyOn, setPolicyOn] = useState(false);

  const low = useModal<void, 'close'>({
    id: 'mr-low',
    style: { width: 260, height: 260 },
    render: () => {
      return <div style={dialogStyle}>Low</div>;
    },
  });
  const mid = useModal<void, 'close'>({
    id: 'mr-mid',
    style: { width: 260, height: 260 },
    render: () => {
      return <div style={dialogStyle}>Mid</div>;
    },
  });
  const high = useModal<void, 'close'>({
    id: 'mr-high',
    style: { width: 260, height: 260 },
    render: () => {
      return <div style={dialogStyle}>High</div>;
    },
  });

  const { dialogManager } = low;

  useEffect(() => {
    if (!policyOn) {
      return undefined;
    }
    return dialogManager.prioritize((modal) => {
      if (modal.id === 'mr-high') {
        return 20;
      }
      return modal.id === 'mr-mid' ? 10 : 0;
    });
  }, [policyOn, dialogManager]);

  return (
    <div>
      <button
        data-testid="mr-open-all"
        onClick={() => {
          // Opened high → mid → low, so the *last* one to arrive is the one that belongs at the
          // bottom. That is what makes the plan two raises long instead of one.
          dialogManager.open('mr-high');
          setTimeout(() => {
            dialogManager.open('mr-mid');
          }, 60);
          setTimeout(() => {
            dialogManager.open('mr-low');
          }, 120);
        }}
        type="button"
      >
        Open all three
      </button>
      <button
        data-testid="mr-toggle-policy"
        onClick={() => {
          setPolicyOn((previous) => {
            return !previous;
          });
        }}
        type="button"
      >
        Toggle the policy
      </button>
      <span data-testid="mr-policy">{policyOn ? 'on' : 'off'}</span>
      {low.Modal}
      {mid.Modal}
      {high.Modal}
    </div>
  );
}
