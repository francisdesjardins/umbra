import { DialogOutlet } from '../../dialog-outlet.js';
import { useDialog } from '../../use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

// ── Harness: nested outlets — inner wins ───────────────────────────────────

function InnerScopeDialog() {
  const { open, isVisible, dialogManager } = useDialog<void, 'inner-done'>({
    id: 'outlet-nested-inner',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Inner outlet dialog</p>
          <button
            onClick={() => {
              dialogManager.open('outlet-nested-outer');
            }}
          >
            Open Outer from Here
          </button>
          <button
            onClick={() => {
              handle.close('inner-done');
            }}
          >
            Close Inner
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
        Open Inner
      </button>
      <span data-testid="is-visible-inner">{isVisible ? 'open' : 'closed'}</span>
    </div>
  );
}

function OuterScopeDialog() {
  const { open, isVisible, dialogManager } = useDialog<void, 'outer-done'>({
    id: 'outlet-nested-outer',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Outer outlet dialog</p>
          <button
            onClick={() => {
              dialogManager.open('outlet-nested-inner');
            }}
          >
            Open Inner from Here
          </button>
          <button
            onClick={() => {
              handle.close('outer-done');
            }}
          >
            Close Outer
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
        Open Outer
      </button>
      <span data-testid="is-visible-outer">{isVisible ? 'open' : 'closed'}</span>
    </div>
  );
}

/**
 * Nested outlets: inner outlet scope captures the inner dialog.
 */
export function OutletNestedHarness() {
  return (
    <DialogOutlet>
      <OuterScopeDialog />
      <DialogOutlet>
        <InnerScopeDialog />
      </DialogOutlet>
    </DialogOutlet>
  );
}
