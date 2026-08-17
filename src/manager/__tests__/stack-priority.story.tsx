import { useEffect, useState } from 'react';
import { useModal } from '../../react/use-modal.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * Two modal dialogs racing for the front, with and without a stack policy. `sp-panel`'s
 * `showModal()` lands after `sp-warning`'s, so the platform paints it in front and the warning
 * falls under its backdrop. The `withPolicy: false` half is the baseline — a reorder that never
 * happened looks like one that was not needed. Both are sized alike and UA-centred, so they
 * overlap and the tests hit-test the viewport centre, not the library's snapshot; the open-panel
 * button sits inside the warning's `render` because the top layer swallows outside clicks.
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
    // Once at start-up: one rule, one place, for parts of the app that never learn about each other.
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
 * Three modal dialogs, and a policy installed after they are on screen — two paths nothing else
 * reaches. `planRaises` returning two ids had until now only ever been checked as a pure function;
 * and a *late* install reorders what is already painted rather than what opens next, a path that
 * stops at `syncStackOrder`'s `document` guard in Node, so only a browser runs it. Opens are
 * programmatic and staggered on a timer because under a policy the dialog a test would click is the
 * one just put *underneath*, so the top layer would swallow the press — the tests dispatch the
 * toggle's click directly for the same reason.
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
          // high → mid → low, so the *last* to arrive belongs at the bottom: two raises, not one.
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

/**
 * One dialog already up with a caret in it, and a policy arriving late — the smallest arrangement
 * reaching `raiseDialog`'s focus restore. Until `prioritize` is called the manager never tracks the
 * top layer, so the first sync compares the desired order against an empty one and lifts
 * **everything** from the bottom; the bottom dialog is the longest up, here also the one holding
 * the keyboard. Without the restore, `showModal()` picks the first focusable and the caret is gone.
 */
export function LatePolicyFocusHarness() {
  const [policyOn, setPolicyOn] = useState(false);

  const only = useModal<void, 'close'>({
    id: 'lp-only',
    style: { width: 280, height: 280 },
    render: () => {
      return (
        <div style={dialogStyle}>
          <p>Already up</p>
          <button data-testid="lp-first">First focusable</button>
          <input data-testid="lp-input" aria-label="Notes" />
        </div>
      );
    },
  });

  const { dialogManager } = only;

  useEffect(() => {
    if (!policyOn) {
      return undefined;
    }
    return dialogManager.prioritize(() => {
      return 0;
    });
  }, [policyOn, dialogManager]);

  return (
    <div>
      <button
        data-testid="lp-open"
        onClick={() => {
          void only.open();
        }}
        type="button"
      >
        Open it
      </button>
      <button
        data-testid="lp-toggle-policy"
        onClick={() => {
          setPolicyOn((previous) => {
            return !previous;
          });
        }}
        type="button"
      >
        Install the policy
      </button>
      <span data-testid="lp-policy">{policyOn ? 'on' : 'off'}</span>
      {only.Modal}
    </div>
  );
}
