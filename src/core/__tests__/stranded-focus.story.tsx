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

  const dialog = useDialog<void, 'ok'>({
    id: 'stranded-focus',
    ariaLabel: 'Stranded focus',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          {/*
            The label is **constant** and the busy state reported beside it: a button whose children
            change is one the renderer may replace, and a replaced node is blurred by being removed,
            dispatching `focusout` where it bubbles to nobody — a different limit from this one.
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
          void dialog.open();
        }}
      >
        Open
      </button>
      {dialog.Dialog}
    </div>
  );
}
