import { type CSSProperties } from 'react';
import { useSlideModal, type SlideAlign, type SlideDirection } from '../../use-slide-modal.js';

// A non-stretch align means the panel is content-sized on the cross axis, so the content
// must define that size itself (the whole point of the option).
const panelStyle: CSSProperties = {
  background: 'Canvas',
  color: 'CanvasText',
  width: 260,
  height: 160,
  padding: 12,
  boxSizing: 'border-box',
};

/**
 * Cross-axis alignment for slide panels: `stretch` (default) fills the cross axis, while
 * `start`/`center`/`end` pin a content-sized panel to that cross-axis position.
 */
export function AlignSlideHarness({
  direction = 'right',
  align = 'start',
}: {
  direction?: SlideDirection;
  align?: SlideAlign;
}) {
  const { open, isOpen, Modal } = useSlideModal({
    id: 'align-slide',
    direction,
    align,
    render: () => {
      return <div style={panelStyle}>Aligned panel</div>;
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
      <span data-testid="is-open">{isOpen ? 'open' : 'closed'}</span>
      {Modal}
    </div>
  );
}
