import type { CSSProperties } from 'react';
import { useDialog } from '../../use-dialog.js';
import { useSlideDialog } from '../../templates/use-slide-dialog.js';

/**
 * The styling surface: `--dialog-backdrop` (inherited, so overriding is a declaration, not a
 * specificity fight), `data-dialog-id`/`data-dialog-type` (CSS reaching one dialog or all non-modal
 * ones), and `style`, merged over a template's placement so a drawer's `left: 0` survives.
 */
export function StylingSurfaceHarness() {
  const sized = useDialog({
    id: 'styling-surface',
    // Small enough that the UA's own `max-width: calc(100% - 6px - 2em)` never trims it.
    style: { width: 200, height: 120 },
    render: () => {
      return <p data-testid="sized-content">Sized by the caller</p>;
    },
  });

  const drawer = useSlideDialog({
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
      {sized.Dialog}
      {drawer.Dialog}
    </div>
  );
}
