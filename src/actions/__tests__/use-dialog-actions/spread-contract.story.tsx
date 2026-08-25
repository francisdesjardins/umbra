import { useState } from 'react';
import { dialogStyle } from '../../../__tests__/story-styles.js';
import { useDialog } from '../../../react/use-dialog.js';

/**
 * What actually happens when the props an action hands out are spread onto a real `<button>`.
 *
 * Every claim the API makes rests on that spread being a plain, correct set of DOM props: the
 * docs say "spread is the single binding pattern". This harness puts one on a native button
 * inside a `<form>`, and counts how many times a slow handler is entered.
 */
export function SpreadContractHarness() {
  const [entries, setEntries] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [release, setRelease] = useState<(() => void) | null>(null);

  const [valid, setValid] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [vetoedRuns, setVetoedRuns] = useState(0);

  const { open, Modal } = useDialog<void, 'guarded' | 'slow' | 'veto'>({
    id: 'spread-contract',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmits((n) => {
                return n + 1;
              });
            }}
          >
            <button
              data-testid="slow-btn"
              {...action('slow', () => {
                setEntries((n) => {
                  return n + 1;
                });
                return new Promise<void>((resolve) => {
                  setRelease(() => {
                    return resolve;
                  });
                });
              })}
            >
              Run Slow
            </button>
          </form>
          <button
            onClick={() => {
              release?.();
            }}
          >
            Finish Slow
          </button>

          {/* An extra disabled reason, added without taking the spread apart. */}
          <button data-testid="guarded-btn" {...action('guarded', { disabled: !valid })}>
            Guarded
          </button>
          <button
            onClick={() => {
              setValid(true);
            }}
          >
            Make Valid
          </button>

          {/* A composed click that vetoes the action. */}
          <button
            data-testid="veto-btn"
            {...action('veto', {
              onClick: (event) => {
                setClicks((n) => {
                  return n + 1;
                });
                event.preventDefault();
              },
              onAction: () => {
                setVetoedRuns((n) => {
                  return n + 1;
                });
              },
            })}
          >
            Veto
          </button>
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
        Open Spread
      </button>
      <span data-testid="entries">{entries}</span>
      <span data-testid="submits">{submits}</span>
      <span data-testid="clicks">{clicks}</span>
      <span data-testid="vetoed-runs">{vetoedRuns}</span>
      {Modal}
    </div>
  );
}
