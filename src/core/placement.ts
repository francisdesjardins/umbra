import type { CSSProperties } from 'react';

// ── Placement ────────────────────────────────────────────────────────────────
//
// Where a dialog is positioned from, expressed as data rather than as markup.
//
// A `<dialog>` opened with `showModal()` is promoted into the browser's top layer and needs no
// positioning at all. `show()` does not promote it, so a non-modal dialog is positioned like
// any other element — and *what it is positioned against* is the whole question. This module is
// the single answer, so the React binding, a future binding, and a host you write yourself all
// place a dialog the same way.

/** The two elements a placement has an opinion about. */
export type DialogPlacement = {
  /**
   * Styles for the element the dialog is positioned against, or `null` when there is nothing
   * to host — a top-layer dialog and a viewport-anchored one answer to the viewport.
   *
   * When this is non-null the dialog **must** be rendered inside an element carrying these
   * styles, and that element must have a size: the dialog fills it.
   */
  readonly host: CSSProperties | null;
  /** Positioning styles for the `<dialog>` itself. */
  readonly dialog: CSSProperties;
};

export type DialogPlacementOptions = {
  /** `dialog.show()` rather than `showModal()` — no backdrop, no top layer. */
  readonly nonModal?: boolean | undefined;
  /** Rendered into `document.body` rather than inline in the tree. */
  readonly portal?: boolean | undefined;
  /**
   * Clip the host, for a dialog whose animation slides it past the host's edge. Without it a
   * positive translate (right/bottom) grows the document's scrollable area and shifts the
   * layout by the same amount, which cancels the slide.
   */
  readonly clip?: boolean | undefined;
};

const CONTAINED_HOST: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  // The host exists to be a containing block and nothing else. Without this it is also an
  // invisible hit target the size of its region, so everything behind it — the trigger that
  // opens the dialog, the content the dialog sits over — stops being clickable the moment a
  // contained dialog is mounted, open or not. The dialog takes its own hits back below.
  pointerEvents: 'none',
};

/**
 * The positioning contract for one dialog variant.
 *
 * Three cases, and the reason each exists:
 *
 * - **modal** — `showModal()` puts the dialog in the top layer, above everything and anchored
 *   to the viewport whatever its ancestors do. No host, no positioning.
 * - **non-modal, portaled** — rendered into `document.body`, so `fixed` anchors it to the
 *   viewport. Use for edge-anchored or centred panels that float over the page.
 * - **non-modal, contained** — rendered inline, so `fixed` would resolve against the nearest
 *   transformed or `will-change` ancestor instead of the viewport, and the dialog jumps when
 *   some parent animates. `absolute` against a host the library owns is immune to that: the
 *   closest positioned ancestor always wins. The cost is that the host must be sized, since
 *   the dialog fills it.
 *
 * @example
 * // A userland host for a contained slide panel — the same contract the React binding uses.
 * const { host, dialog } = dialogPlacement({ nonModal: true, clip: true });
 * Object.assign(panelRegion.style, host);
 * Object.assign(dialogElement.style, dialog);
 */
export function dialogPlacement(options: DialogPlacementOptions = {}): DialogPlacement {
  const { nonModal = false, portal = false, clip = false } = options;

  if (!nonModal) {
    return { host: null, dialog: {} };
  }

  if (portal) {
    return { host: null, dialog: { position: 'fixed', inset: 0 } };
  }

  return {
    host: clip ? { ...CONTAINED_HOST, overflow: 'clip' } : CONTAINED_HOST,
    // `pointerEvents: 'auto'` undoes the host's `none` for the dialog itself, so the panel is
    // interactive while the region around it stays as clickable as it was before.
    dialog: { position: 'absolute', inset: 0, pointerEvents: 'auto' },
  };
}
