import { useState, type CSSProperties } from 'react';
import { useSlideDialog, type SlideDirection } from '../../templates/use-slide-dialog.js';

const stageStyle: CSSProperties = {
  position: 'relative',
  width: 480,
  height: 320,
  // Offset from the viewport origin so a `fixed` dialog would land off the stage.
  marginLeft: 120,
  marginTop: 80,
  overflow: 'hidden',
  border: '1px solid black',
};

const panelStyle: CSSProperties = {
  background: 'Canvas',
  color: 'CanvasText',
  height: '100%',
  padding: '16px 20px',
  boxSizing: 'border-box',
};

/**
 * Contained (non-modal + no-portal) slide inside a transformed ancestor. Regression: a `fixed`
 * inline dialog resolves against the nearest transformed ancestor, which hijacked the containing
 * block and made the panel jump; contained mode anchors to an owned `relative` wrapper instead.
 */
export function ContainedPositioningSlideHarness({
  direction = 'bottom',
}: {
  direction?: SlideDirection;
}) {
  const [behindClicks, setBehindClicks] = useState(0);

  const { open, isVisible, Modal } = useSlideDialog({
    id: 'contained-positioning-slide',
    direction,
    nonModal: true,
    render: () => {
      return (
        <div style={panelStyle}>
          <p>Contained non-modal panel</p>
        </div>
      );
    },
  });

  return (
    <div style={{ transform: 'translateY(-2px)' }}>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Panel
      </button>
      <span data-testid="is-visible">{isVisible ? 'open' : 'closed'}</span>
      <span data-testid="behind-clicks">{behindClicks}</span>
      <div data-testid="stage" style={stageStyle}>
        {/* Fills the stage, underneath the library's host. The host covers this region for
            the whole life of the modal, closed included — if it takes hits, this is dead. */}
        <button
          data-testid="behind"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          onClick={() => {
            setBehindClicks((count) => {
              return count + 1;
            });
          }}
        >
          Behind the panel
        </button>
        {Modal}
      </div>
    </div>
  );
}
