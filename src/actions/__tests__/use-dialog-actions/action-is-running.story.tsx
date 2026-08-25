import { useDialog } from '../../../react/use-dialog.js';
import { dialogStyle } from '../../../__tests__/story-styles.js';

/** Released by the test, so an action can be observed *while* it runs rather than after. */
let release = (): void => {
  return;
};
const gate = () => {
  return new Promise<void>((resolve) => {
    release = resolve;
  });
};

/**
 * `action.isRunning(reason)` read from outside the button that owns the action.
 *
 * The header status and the unrelated field are the point: neither spreads the action's props,
 * so before this existed neither had any way to know which action was running — only that one
 * was, through the aggregate.
 */
export function ActionIsRunningHarness() {
  const { open, Modal } = useDialog<void, 'save' | 'cancel'>({
    id: 'action-is-running',
    render: ({ action, hasRunningAction }) => {
      return (
        <div style={dialogStyle}>
          <header data-testid="status">{action.isRunning('save') ? 'saving' : 'idle'}</header>
          <span data-testid="cancel-running">{String(action.isRunning('cancel'))}</span>
          <span data-testid="aggregate">{String(hasRunningAction)}</span>
          {/* Not an action's button, and disabled for one action rather than for any. */}
          <input data-testid="field" disabled={action.isRunning('save')} readOnly value="" />
          <button
            {...action('save', async (close) => {
              await gate();
              close();
            })}
            data-testid="save-btn"
          >
            Save
          </button>
          <button {...action('cancel')} data-testid="cancel-btn">
            Cancel
          </button>
          {/* Inside `render`, because `showModal()` puts the dialog in the top layer and the
              native backdrop swallows every click outside it. Not a detail of this harness —
              the rule for any control that has to stay clickable while a modal is open. */}
          <button
            onClick={() => {
              release();
            }}
            data-testid="release-btn"
          >
            Release
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
        Open
      </button>
      {Modal}
    </div>
  );
}
