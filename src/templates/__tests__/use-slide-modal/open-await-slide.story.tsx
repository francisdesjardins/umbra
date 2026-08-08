import { type CSSProperties, useState } from 'react';
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
 * Tests slide in from left. openAndWait() resolves with the close reason.
 */
export function OpenAwaitSlideHarness() {
  const [status, setStatus] = useState('idle');

  const { openAndWait, Modal } = useSlideModal<void, 'close'>({
    id: 'slide-wait',
    direction: 'left',
    render: ({ handle }) => {
      return (
        <div style={slidePanelStyle}>
          <button
            onClick={() => {
              handle.close('close');
            }}
          >
            Close
          </button>
        </div>
      );
    },
  });

  const handleOpen = async () => {
    setStatus('waiting');
    const [, result] = await openAndWait();
    setStatus(`resolved:${String(result?.reason)}`);
  };

  return (
    <>
      <button
        onClick={() => {
          void handleOpen();
        }}
      >
        Open and Wait
      </button>
      <span data-testid="status">{status}</span>
      {Modal}
    </>
  );
}
