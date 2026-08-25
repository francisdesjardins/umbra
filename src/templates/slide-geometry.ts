import type { DialogAnimation } from '../core/types.js';

/**
 * The geometry of a slide panel, as data — no framework, no hook. `useSlideDialog` is a style and an
 * animation over `useDialog`, and neither half is renderer work, so both bindings must answer these
 * identically or the two templates are two templates wearing one name.
 */

/**
 * Direction from which the slide panel enters the viewport. **Physical edges — an open question, not
 * a settled answer**: an RTL document wants a *logical* `inline-start`, which this union cannot say,
 * so an RTL caller flips the direction from `dir` themselves. Going logical means inset-inline/block
 * in the placement table and both style functions, and migrating all four names — it waits on a
 * real RTL consumer, not a guess.
 */
export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

/**
 * Alignment along the panel's **cross axis** — perpendicular to the slide, so vertical for
 * `left`/`right` (`start` = top, `end` = bottom) and horizontal for `top`/`bottom`. `stretch`
 * (default) fills it edge-to-edge, the classic full-height drawer or full-width sheet; `start` /
 * `center` / `end` pin the panel at that position and leave its cross-axis size to the content or
 * your `style` — corner toasts, command palettes, partial-height panels.
 */
export type SlideAlign = 'stretch' | 'start' | 'center' | 'end';

/**
 * Everything the panel's position is derived from: which edge, how it sits across it, and what it is
 * measured against. One shape rather than three arguments, since both style functions read the same
 * three answers and callers passing them in different orders is the failure it removes.
 */
export type SlideGeometry = {
  /** Edge the panel enters from. */
  readonly direction: SlideDirection;
  /** Cross-axis alignment. */
  readonly align: SlideAlign;
  /**
   * `true` for a non-modal, inline (non-portaled) dialog: it anchors to the library's positioned
   * wrapper via `absolute` and sizes to that container (`100%`) rather than the viewport — see
   * `useDialog`'s contained mode.
   */
  readonly contained: boolean;
};

/** The full cross-axis size: the container's in contained mode, the viewport's otherwise. */
type CrossSize = '100%' | '100dvh' | '100dvw';

/**
 * Exactly the properties a slide panel sets, with exactly the values it sets them to. Enumerated
 * rather than typed as a general style object for `DialogHostStyle`'s reason: a literal type is
 * assignable to every binding's style type, so one table feeds all without an assertion at the seam.
 */
export type SlideDialogStyle = {
  readonly position?: 'absolute' | 'fixed';
  readonly margin?: 0;
  readonly maxWidth?: 'none' | CrossSize;
  readonly maxHeight?: 'none' | CrossSize;
  readonly top?: 'auto' | 0 | '50%';
  readonly right?: 'auto' | 0;
  readonly bottom?: 'auto' | 0;
  readonly left?: 'auto' | 0 | '50%';
  readonly width?: CrossSize;
  readonly height?: CrossSize;
};

/** The animation's style half: a slide moves one property, and this is it. */
export type SlideAnimationStyle = { readonly transform: string };

const SLIDE_TRANSFORMS: Record<SlideDirection, { entrance: string; exit: string }> = {
  left: { entrance: 'translateX(0)', exit: 'translateX(-100%)' },
  right: { entrance: 'translateX(0)', exit: 'translateX(100%)' },
  top: { entrance: 'translateY(0)', exit: 'translateY(-100%)' },
  bottom: { entrance: 'translateY(0)', exit: 'translateY(100%)' },
};

/** Main axis: the edge the panel is pinned to is the edge it slides in from. */
const MAIN_AXIS: Record<SlideDirection, SlideDialogStyle> = {
  left: { left: 0 },
  right: { right: 0 },
  top: { top: 0 },
  bottom: { bottom: 0 },
};

const isHorizontal = (direction: SlideDirection): boolean => {
  return direction === 'left' || direction === 'right';
};

/**
 * The entrance/exit transforms for one direction and alignment. `align: 'center'` puts the panel's
 * cross-axis *edge* at the 50% mark and so needs a -50% self-shift; transform is a single property
 * the slide owns, so that shift is folded into BOTH keyframes — constant across the animation —
 * rather than set separately, where the slide would overwrite it.
 */
export function slideAnimation(
  direction: SlideDirection,
  align: SlideAlign
): DialogAnimation<SlideAnimationStyle> {
  const t = SLIDE_TRANSFORMS[direction];

  const crossShift =
    align === 'center' ? (isHorizontal(direction) ? ' translateY(-50%)' : ' translateX(-50%)') : '';

  return {
    entrance: { transform: `${t.entrance}${crossShift}` },
    exit: { transform: `${t.exit}${crossShift}` },
    duration: 300,
    exitDuration: 200,
    transitionProperty: 'transform',
  };
}

/**
 * Cross-axis placement for one direction + alignment. `stretch` pins both cross-axis edges and
 * forces the full cross size — the edge-to-edge drawer; the others pin a single edge (or the
 * midpoint via `50%`) and leave the size to the content, `center`'s self-offset riding in the base
 * transform rather than fighting the slide — see {@link slideAnimation}.
 */
function crossAxisStyle(geometry: SlideGeometry): SlideDialogStyle {
  const { direction, align, contained } = geometry;
  const horizontal = isHorizontal(direction);
  const fullCross: CrossSize = contained ? '100%' : horizontal ? '100dvh' : '100dvw';

  if (align === 'stretch') {
    return horizontal
      ? { top: 0, bottom: 0, height: fullCross }
      : { left: 0, right: 0, width: fullCross };
  }

  if (align === 'center') {
    return horizontal ? { top: '50%', maxHeight: fullCross } : { left: '50%', maxWidth: fullCross };
  }

  const atStart = align === 'start';
  if (horizontal) {
    return atStart ? { top: 0, maxHeight: fullCross } : { bottom: 0, maxHeight: fullCross };
  }
  return atStart ? { left: 0, maxWidth: fullCross } : { right: 0, maxWidth: fullCross };
}

/**
 * Positioning styles for the slide `<dialog>`, each direction anchoring to its own edge. All four
 * insets are set explicitly (unused edges → `auto`) because non-modal dialogs receive `inset: 0`
 * from the core layer, and an unset opposite edge lets that `0` leak in and over-constrain the box
 * (`right: 0` plus a leaked `left: 0` → full-width instead of content-width). Anchoring at the near
 * edge, not the far one via `left/top: 100%`, keeps the available size full so `auto` never
 * collapses to zero.
 *
 * @param geometry - Which edge, how it sits across it, and what it is measured against.
 */
export function slideDialogStyle(geometry: SlideGeometry): SlideDialogStyle {
  const { direction, contained } = geometry;
  return {
    position: contained ? 'absolute' : 'fixed',
    margin: 0,
    maxWidth: 'none',
    maxHeight: 'none',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    ...MAIN_AXIS[direction],
    ...crossAxisStyle(geometry),
  };
}
