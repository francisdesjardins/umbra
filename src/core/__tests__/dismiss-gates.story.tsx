import { useState } from 'react';
import { useDialog } from '../../react.js';
import { dialogStyle } from '../../__tests__/story-styles.js';

/**
 * A non-modal panel whose dismissal can be refused three ways, and a page to press against.
 *
 * One harness rather than three, because the gates are one cascade and what matters is which of
 * them answered: `onKeyDown` swallowing the press, an action running, and the panel not being the
 * one in front.
 */
export function DismissGatesHarness({ swallowKeys = false }: { readonly swallowKeys?: boolean }) {
  const [keysSeen, setKeysSeen] = useState(0);
  const [hotkeyRuns, setHotkeyRuns] = useState(0);
  const [release, setRelease] = useState<(() => void) | null>(null);

  const panel = useDialog<void, 'slow'>({
    id: 'dismiss-gates',
    nonModal: true,
    dismissOnClickOutside: true,
    ariaLabel: 'Gated panel',
    onKeyDown: (event) => {
      setKeysSeen((seen) => {
        return seen + 1;
      });
      if (swallowKeys) {
        // The documented way for a caller to keep a key: the dialog stands down on a prevented one.
        event.preventDefault();
      }
    },
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            data-testid="slow-action"
            {...action('slow', () => {
              return new Promise<void>((resolve) => {
                setRelease(() => {
                  return resolve;
                });
              });
            })}
          >
            Work
          </button>
          {/* A hotkey rather than the dismiss key: the window listener claims that one at capture,
              so the dialog's own keydown — where `onKeyDown` runs — never hears it. */}
          <button
            data-testid="hotkey-action"
            {...action('slow', {
              hotkey: 'Enter',
              onAction: (close) => {
                setHotkeyRuns((runs) => {
                  return runs + 1;
                });
                close();
              },
            })}
          >
            Go
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void panel.open();
        }}
        type="button"
      >
        Open
      </button>
      <button data-testid="outside" type="button">
        Outside
      </button>
      <button
        data-testid="finish"
        onClick={() => {
          release?.();
        }}
        type="button"
      >
        Finish
      </button>
      <span data-testid="keys-seen">{keysSeen}</span>
      <span data-testid="hotkey-runs">{hotkeyRuns}</span>
      <span data-testid="visible">{panel.isVisible ? 'open' : 'closed'}</span>
      {panel.Dialog}
    </div>
  );
}

/** A modal whose dismiss key is not Escape, so the native `cancel` has nothing to stand in for. */
export function InertEscapeHarness() {
  const dialog = useDialog<void, 'ok'>({
    id: 'inert-escape',
    dismissKey: 'F2',
    ariaLabel: 'Inert escape',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button data-testid="ok" {...action('ok')}>
            OK
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        data-testid="open"
        onClick={() => {
          void dialog.open();
        }}
        type="button"
      >
        Open
      </button>
      <span data-testid="visible">{dialog.isVisible ? 'open' : 'closed'}</span>
      {dialog.Dialog}
    </div>
  );
}
