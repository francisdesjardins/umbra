import { ModalOutlet } from '../../modal-outlet.js';
import { useModal } from '../../use-modal.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

// ── Harness: nested outlets — inner wins ───────────────────────────────────

function InnerScopeModal() {
  const { open, isVisible, dialogManager } = useModal<void, 'inner-done'>({
    id: 'outlet-nested-inner',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Inner outlet modal</p>
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

function OuterScopeModal() {
  const { open, isVisible, dialogManager } = useModal<void, 'outer-done'>({
    id: 'outlet-nested-outer',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Outer outlet modal</p>
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
 * Nested outlets: inner outlet scope captures the inner modal.
 */
export function OutletNestedHarness() {
  return (
    <ModalOutlet>
      <OuterScopeModal />
      <ModalOutlet>
        <InnerScopeModal />
      </ModalOutlet>
    </ModalOutlet>
  );
}
