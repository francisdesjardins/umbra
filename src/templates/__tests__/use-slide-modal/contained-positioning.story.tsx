import { useState, type CSSProperties } from 'react';
import { useSlideModal, type SlideDirection } from '../../use-slide-modal.js';

const stageStyle: CSSProperties = {
  position: 'relative',
  width: 480,
  height: 320,
  // Offset from the viewport origin so a viewport-anchored ('fixed') dialog would
  // land somewhere other than the stage — makes the containment assertion meaningful.
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
 * Non-modal + no-portal ("contained") slide rendered inside a transformed ancestor.
 *
 * Regression: a `position: fixed` inline non-modal dialog resolves against the nearest
 * transformed ancestor, so a hover `transform` (here made permanent) hijacked the
 * containing block — the panel jumped to the ancestor's box / flickered. Contained mode
 * anchors the dialog to an owned `position: relative` wrapper via `position: absolute`,
 * so the transformed ancestor no longer affects it.
 */
export function ContainedPositioningSlideHarness({
  direction = 'bottom',
}: {
  direction?: SlideDirection;
}) {
  const [behindClicks, setBehindClicks] = useState(0);

  const { open, isOpen, Modal } = useSlideModal({
    id: 'contained-positioning-slide',
    direction,
    nonModal: true,
    // portal omitted (false) → contained mode
    render: () => {
      return (
        <div style={panelStyle}>
          <p>Contained non-modal panel</p>
        </div>
      );
    },
  });

  return (
    // Transformed ancestor: without the fix this becomes the containing block for a
    // `fixed` dialog. Contained mode must ignore it.
    <div style={{ transform: 'translateY(-2px)' }}>
      <button
        onClick={async () => {
          await open();
        }}
      >
        Open Panel
      </button>
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
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
