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

const slideBarStyle: CSSProperties = {
  background: 'Canvas',
  color: 'CanvasText',
  width: '100%',
  padding: '24px 28px',
  boxSizing: 'border-box',
};

/**
 * Tests four independent panels — left, right, top, bottom. Tracks last active direction.
 */
export function MultiDirectionSlideHarness() {
  const [lastDirection, setLastDirection] = useState('');

  const left = useSlideDialog<void, 'close'>({
    id: 'slide-left',
    direction: 'left',
    render: ({ handle, direction }) => {
      return (
        <div style={slidePanelStyle}>
          <span data-testid="active-direction">{direction}</span>
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
    onClose: () => {
      setLastDirection('left');
    },
  });

  const right = useSlideDialog<void, 'close'>({
    id: 'slide-right',
    direction: 'right',
    render: ({ handle, direction }) => {
      return (
        <div style={slidePanelStyle}>
          <span data-testid="active-direction">{direction}</span>
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
    onClose: () => {
      setLastDirection('right');
    },
  });

  const top = useSlideDialog<void, 'close'>({
    id: 'slide-top',
    direction: 'top',
    render: ({ handle, direction }) => {
      return (
        <div style={slideBarStyle}>
          <span data-testid="active-direction">{direction}</span>
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
    onClose: () => {
      setLastDirection('top');
    },
  });

  const bottom = useSlideDialog<void, 'close'>({
    id: 'slide-bottom',
    direction: 'bottom',
    render: ({ handle, direction }) => {
      return (
        <div style={slideBarStyle}>
          <span data-testid="active-direction">{direction}</span>
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
    onClose: () => {
      setLastDirection('bottom');
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          void left.open();
        }}
      >
        Open Left
      </button>
      <button
        onClick={() => {
          void right.open();
        }}
      >
        Open Right
      </button>
      <button
        onClick={() => {
          void top.open();
        }}
      >
        Open Top
      </button>
      <button
        onClick={() => {
          void bottom.open();
        }}
      >
        Open Bottom
      </button>
      <span data-testid="last-direction">{lastDirection}</span>
      {left.Modal}
      {right.Modal}
      {top.Modal}
      {bottom.Modal}
    </div>
  );
}
