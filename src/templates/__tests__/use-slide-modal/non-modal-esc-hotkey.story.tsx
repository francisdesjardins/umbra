import { type CSSProperties, useState } from 'react';
import { defineAction, useModalActions } from '../../../actions/use-modal-actions.js';
import { Key } from '../../../utils/keys.js';
import { useSlideModal } from '../../use-slide-modal.js';

const slidePanelStyle: CSSProperties = {
  background: 'Canvas',
  color: 'CanvasText',
  height: '100%',
  padding: '24px 28px',
  minWidth: 240,
  boxSizing: 'border-box',
};

/**
 * Tests that pressing ESC from outside a non-modal slide panel fires the
 * actions action declared with hotkey: Key.Escape, rather than silently
 * swallowing the event.
 *
 * Regression: the window capture listener called stopPropagation() then
 * returned early when preventDismiss = true, so the dialog-level onKeyDown
 * never ran and the ESC hotkey did nothing.
 */
export function NonModalEscHotkeySlideHarness() {
  const [lastReason, setLastReason] = useState('');

  const actions = useModalActions({
    cancel: defineAction({ hotkey: Key.Escape }),
  });

  const { open, isOpen, Modal } = useSlideModal({
    id: 'non-modal-esc-hotkey-slide',
    direction: 'right',
    nonModal: true,
    actions,
    render: () => {
      return (
        <div style={slidePanelStyle}>
          <p>Non-modal panel with ESC hotkey</p>
          <button
            {...actions.cancel((close) => {
              close();
            })}
          >
            Cancel
          </button>
        </div>
      );
    },
    onClose: (result) => {
      setLastReason(result.reason);
    },
  });

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Panel
      </button>
      <button data-testid="outside-button">Outside Button</button>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {/* Non-modal + no-portal is "contained": the panel anchors to (and sizes against)
          its nearest positioned ancestor, so it needs a sized, relative host. */}
      <div style={{ position: 'relative', width: 480, height: 320 }}>{Modal}</div>
    </div>
  );
}
