import { useState } from 'react';
import { useModal } from '../../react.js';
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

  const modal = useModal<void, 'ok'>({
    id: 'stranded-focus',
    ariaLabel: 'Stranded focus',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
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
            {busy ? 'Working…' : 'Do background work'}
          </button>
          <button {...action('ok')} data-testid="stranded-ok">
            OK
          </button>
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
      {modal.Modal}
    </div>
  );
}
