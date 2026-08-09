import type { ModalAnimation } from '../core/types.js';

/**
 * The geometry of a slide panel, as data — no framework, no hook.
 *
 * `useSlideModal` is a style and an animation over `useModal` and nothing else, and neither half
 * is renderer work: which edge the panel is pinned to, how far it travels, and what it does on
 * the cross axis are answers a Solid binding needs to give identically or the two templates are
 * two different templates wearing one name. So they live here, and each binding's hook is the
 * three lines that hand them to its own `useModal`.
 */

/** Direction from which the slide panel enters the viewport. */
export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

/**
 * Alignment along the panel's **cross axis** — the axis perpendicular to the slide.
 *
 * For `left`/`right` the cross axis is vertical (`start` = top, `end` = bottom); for
 * `top`/`bottom` it is horizontal (`start` = left, `end` = right).
 *
 * - `stretch` (default) — fill the cross axis edge-to-edge, i.e. a classic full-height
 *   side drawer or full-width top/bottom sheet.
 * - `start` / `center` / `end` — the panel takes only the size its content (or your `style`)
 *   defines on the cross axis and is pinned to that position. Use for corner toasts,
 *   centered command palettes, or partial-height side panels.
 */
export type SlideAlign = 'stretch' | 'start' | 'center' | 'end';

/** The full cross-axis size: the container's in contained mode, the viewport's otherwise. */
type CrossSize = '100%' | '100dvh' | '100dvw';

/**
 * Exactly the properties a slide panel sets, with exactly the values it sets them to.
 *
 * Enumerated rather than typed as a general style object for the reason `DialogHostStyle` is: a
 * literal type is assignable to *every* binding's style type — React's `CSSProperties` included —
 * so this one table can feed all of them without an assertion at the seam.
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
 * The entrance/exit transforms for one direction and alignment.
 *
 * `align: 'center'` positions the panel's cross-axis *edge* at the 50% mark, so it needs a
 * -50% self-shift to be truly centered. Transform is a single property, and the slide owns
 * it — so the cross-axis shift is folded into BOTH keyframes (constant across the animation)
 * instead of being set separately, where the slide would overwrite it.
 */
export function slideAnimation(
  direction: SlideDirection,
  align: SlideAlign
): ModalAnimation<SlideAnimationStyle> {
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
 * Cross-axis placement for one direction + alignment.
 *
 * `stretch` pins both cross-axis edges (`0`/`0`) and forces the full cross size — the classic
 * edge-to-edge drawer. The other values pin a single edge (or center via `50%` + a 50%
 * self-offset) and leave the size to the content, so the panel is only as large as it needs.
 *
 * The centering offset is composed into the *base* transform rather than fighting the slide:
 * the slide animation drives the main axis only, so a cross-axis `translate` on the same
 * element would be overwritten. Instead `center` uses `top: 50%` plus a `translateY(-50%)`
 * folded into every keyframe (see {@link slideAnimation}).
 */
function crossAxisStyle(
  direction: SlideDirection,
  align: SlideAlign,
  contained: boolean
): SlideDialogStyle {
  const horizontal = isHorizontal(direction);
  const fullCross: CrossSize = contained ? '100%' : horizontal ? '100dvh' : '100dvw';

  if (align === 'stretch') {
    return horizontal
      ? { top: 0, bottom: 0, height: fullCross }
      : { left: 0, right: 0, width: fullCross };
  }

  if (align === 'center') {
    // Pin the cross-axis midpoint; the -50% self-shift is applied via the animation transform.
    return horizontal ? { top: '50%', maxHeight: fullCross } : { left: '50%', maxWidth: fullCross };
  }

  const atStart = align === 'start';
  if (horizontal) {
    return atStart ? { top: 0, maxHeight: fullCross } : { bottom: 0, maxHeight: fullCross };
  }
  return atStart ? { left: 0, maxWidth: fullCross } : { right: 0, maxWidth: fullCross };
}

/**
 * Positioning styles for the slide `<dialog>`.
 *
 * Each direction anchors to its own edge (`left`/`right`/`top`/`bottom: 0`). All four insets are
 * set explicitly (unused edges → `auto`) because non-modal dialogs receive `inset: 0` from the
 * core layer; leaving the opposite edge unset would let that `0` leak in and over-constrain the
 * box (e.g. `right: 0` + a leaked `left: 0` → full-width instead of content-width). Anchoring at
 * the near/far edge (not the far edge via `left/top: 100%`) also keeps the available size full,
 * so `auto` never collapses to zero.
 *
 * @param direction - Edge the panel enters from.
 * @param contained - `true` for a non-modal, inline (non-portaled) dialog. It anchors to the
 *   library's positioned wrapper via `absolute` and sizes to that container (`100%`) instead of
 *   the viewport (`100dvw`/`100dvh`) — see `useModal`'s contained mode.
 * @param align - Cross-axis alignment.
 */
export function slideDialogStyle(
  direction: SlideDirection,
  contained: boolean,
  align: SlideAlign
): SlideDialogStyle {
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
    ...crossAxisStyle(direction, align, contained),
  };
}
