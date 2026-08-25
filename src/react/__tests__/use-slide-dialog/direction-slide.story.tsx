import type { CSSProperties } from 'react';
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
 * Tests that the direction string is exposed in the render context.
 */
export function DirectionSlideHarness() {
  const { open, Modal } = useSlideDialog<void, 'close'>({
    id: 'slide-direction',
    direction: 'right',
    render: ({ handle, direction }) => {
      return (
        <div style={slidePanelStyle}>
          <span data-testid="direction">{direction}</span>
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

  return (
    <div>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Panel
      </button>
      {Modal}
    </div>
  );
}
