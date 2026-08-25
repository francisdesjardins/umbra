import { type CSSProperties, useState } from 'react';
import { useSlideDialog } from '../../templates/use-slide-dialog.js';

const slidePanelStyle: CSSProperties = {
  background: 'Canvas',
  color: 'CanvasText',
  height: '100%',
  padding: '24px 28px',
  minWidth: 240,
  boxSizing: 'border-box',
};

/**
 * Tests slide in from right. Tracks last close reason.
 */
export function BasicSlideHarness() {
  const [lastReason, setLastReason] = useState('');

  const { open, isVisible, Modal } = useSlideDialog<void, 'close'>({
    id: 'slide-basic',
    direction: 'right',
    render: ({ handle }) => {
      return (
        <div style={slidePanelStyle}>
          <p>Slide content</p>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close Panel
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
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="last-reason">{lastReason}</span>
      {Modal}
    </div>
  );
}
