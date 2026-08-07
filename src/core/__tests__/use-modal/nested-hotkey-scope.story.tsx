import { useState } from 'react';
import { Key } from '../../../utils/keys.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../story-styles.js';

/**
 * A modal holding an open **non-modal** panel in its own subtree, both declaring `Enter`.
 *
 * Non-modal is the case that makes this reachable: it does not block, so focus can be in the
 * outer modal while the inner dialog is open — the outer modal legitimately dispatches its own
 * hotkey. The panel is rendered *before* the outer modal's own button on purpose, because a
 * hotkey is dispatched by finding the button in the DOM: an unscoped lookup takes the first
 * match in document order, which is the panel's, and the wrong action runs.
 */
export function NestedHotkeyScopeHarness() {
  const [fired, setFired] = useState<string[]>([]);

  const record = (who: string) => {
    setFired((previous) => {
      return [...previous, who];
    });
  };

  const inner = useModal<void, 'inner'>({
    id: 'nested-inner',
    nonModal: true,
    portal: false,
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          <button
            {...action('inner', {
              hotkey: Key.Enter,
              onAction: () => {
                record('inner');
              },
            })}
            data-testid="nested-inner-btn"
          >
            Inner
          </button>
        </div>
      );
    },
  });

  const outer = useModal<void, 'outer'>({
    id: 'nested-outer',
    ariaLabel: 'Outer',
    render: ({ action }) => {
      return (
        <div style={dialogStyle}>
          {/* First in document order — the trap an unscoped lookup falls into. */}
          {inner.Modal}
          <button
            {...action('outer', {
              hotkey: Key.Enter,
              onAction: () => {
                record('outer');
              },
            })}
            data-testid="nested-outer-btn"
          >
            Outer
          </button>
          <button
            onClick={async () => {
              await inner.open();
            }}
            data-testid="nested-open-inner"
          >
            Open inner
          </button>
        </div>
      );
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await outer.open();
        }}
      >
        Open Outer
      </button>
      <span data-testid="nested-fired">{fired.join(',')}</span>
      {outer.Modal}
    </div>
  );
}
