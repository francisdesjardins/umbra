import type { CSSProperties } from 'react';
import { useModal } from '../../use-modal.js';
import { useSlideModal } from '../../templates/use-slide-modal.js';

/**
 * The surface a consumer styles a dialog through, with nothing else in the way:
 *
 * - `--dialog-backdrop` — the library's one visual opinion, as an inherited custom property,
 *   so overriding it is a declaration rather than a specificity fight.
 * - `data-modal-id` / `data-modal-type` — how CSS reaches one dialog, or every non-modal one,
 *   without knowing where it renders.
 * - `style` — the size of the `<dialog>` box itself, which the library never decides.
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

  // A template picks the placement; the caller still picks the size — its `style` is merged
  // over the template's rather than replacing it, so `left: 0` survives and the width does not.
  const drawer = useSlideModal({
    id: 'styling-surface-slide',
    direction: 'left',
    style: { width: 240 },
    render: () => {
      return <p data-testid="drawer-content">Drawer</p>;
    },
  });

  return (
    // The property is inherited, so it can be set anywhere above the dialog — the top layer
    // changes where a dialog paints, not what it inherits.
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
