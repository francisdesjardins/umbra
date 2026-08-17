import type { CSSProperties } from 'react';
import { useModal } from '../../use-modal.js';
import { useSlideModal } from '../../templates/use-slide-modal.js';

/**
 * The styling surface: `--dialog-backdrop` (inherited, so overriding is a declaration, not a
 * specificity fight), `data-modal-id`/`data-modal-type` (CSS reaching one dialog or all non-modal
 * ones), and `style`, merged over a template's placement so a drawer's `left: 0` survives.
 */
export function StylingSurfaceHarness() {
  const sized = useModal({
    id: 'styling-surface',
    // Small enough that the UA's own `max-width: calc(100% - 6px - 2em)` never trims it.
    style: { width: 200, height: 120 },
    render: () => {
      return <p data-testid="sized-content">Sized by the caller</p>;
    },
  });

  const drawer = useSlideModal({
    id: 'styling-surface-slide',
    direction: 'left',
    style: { width: 240 },
    render: () => {
      return <p data-testid="drawer-content">Drawer</p>;
    },
  });

  return (
    // Set anywhere above: the top layer changes where a dialog paints, not what it inherits.
    <div style={{ '--dialog-backdrop': 'rgb(0, 128, 0)' } as CSSProperties}>
      <button
        onClick={async () => {
          await sized.open();
        }}
      >
        Open Sized
      </button>
      <button
        onClick={async () => {
          await drawer.open();
        }}
      >
        Open Drawer
      </button>
      {sized.Modal}
      {drawer.Modal}
    </div>
  );
}
