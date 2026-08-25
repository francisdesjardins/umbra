import { useState } from 'react';
import { useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A control the caller disables while its own work runs — the shape of every loading button, and
 * deliberately **not** an action: the engine knows nothing about it, so none of the action-driven
 * focus machinery can be what puts the keyboard back.
 *
 * Two focusables, because a dialog with one cannot tell "focus came back" from "focus never had
 * anywhere else to be". The second is the floor the reclaim lands on while the first is still
 * disabled.
 */
export function StrandedFocusHarness() {
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(0);

  const modal = useDialog<void, 'ok'>({
    id: 'stranded-focus',
    ariaLabel: 'Stranded focus',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          {/*
            The label is **constant** and the busy state is reported beside it, deliberately. A
            button whose children change between the two states is a button the renderer is free to
            replace rather than update — and a replaced node is blurred by being *removed*, which
            dispatches `focusout` on a node already out of the tree, where it bubbles to nobody.
            That is a real limit and a different one from what this harness is for; keeping the
            children stable holds the node identity so this asks its own question.
          */}
          <button
            data-testid="stranded-work"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setBusy(false);
                setRuns((count) => {
                  return count + 1;
                });
              }, 300);
            }}
          >
            Do background work
          </button>
          <button {...action('ok')} data-testid="stranded-ok">
            OK
          </button>
          <span data-testid="stranded-state">{busy ? 'working' : 'idle'}</span>
          <span data-testid="stranded-runs">{runs}</span>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="stranded-open"
        onClick={() => {
          void modal.open();
        }}
      >
        Open
      </button>
      {modal.Dialog}
    </div>
  );
}
