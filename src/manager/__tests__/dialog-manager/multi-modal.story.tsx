import { useDialogManager } from '../../use-dialog-manager.js';
import { useModal } from '../../../core/use-modal.js';
import { dialogStyle } from '../../../core/__tests__/story-styles.js';

/**
 * Tests stack queries: foreground and openDialogs ordering via useDialogManager.
 * openDialogs is sorted by open time, so it doubles as the stack order.
 *
 * Flow: "Open First" → inside first modal click "Open Second" → inside second
 * modal click "Close Second" → inside first modal click "Close First".
 * This ensures all interactions happen with the topmost dialog, which is the
 * only one that can receive clicks in the native top layer.
 */
export function MultiModalHarness() {
  const { openDialogs, foreground } = useDialogManager();

  const { Modal: Modal1, dialogManager } = useModal<void, 'close'>({
    id: 'dm-first',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>First modal</p>
          <button
            onClick={() => {
              dialogManager.open('dm-second');
            }}
          >
            Open Second
          </button>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close First
          </button>
        </div>
      );
    },
  });

  const { Modal: Modal2 } = useModal<void, 'close'>({
    id: 'dm-second',
    render: ({ handle }) => {
      return (
        <div style={dialogStyle}>
          <p>Second modal</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close Second
          </button>
        </div>
      );
    },
  });

  const stackIds = openDialogs
    .map((d) => {
      return d.id;
    })
    .join(',');

  return (
    <div>
      <button
        onClick={() => {
          dialogManager.open('dm-first');
        }}
      >
        Open First
      </button>
      <span data-testid="dialog-count">{openDialogs.length}</span>
      <span data-testid="top-dialog">{foreground?.id ?? ''}</span>
      <span data-testid="stack-order">{stackIds}</span>
      {Modal1}
      {Modal2}
    </div>
  );
}
