import type { CSSProperties } from 'react';
import type { ModalAnimation, UseModalReturn } from '../core/types.js';
import { useModal } from '../core/use-modal.js';
import { buildModalOptions, type BaseRenderContext, type TemplateBaseOptions } from './shared.js';

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

/**
 * Context passed to the SlideModal render function.
 * Provides modal state, the close handle, and the slide direction.
 *
 * @typeParam TData - The modal's close payload type.
 */
export type SlideModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/**
 * Options for `useSlideModal`.
 *
 * @typeParam TData - Typed data payload from close. Defaults to `void`; declare it on the hook,
 * which is the one place it is stated.
 * @typeParam TReason - The reasons this panel closes with. Declare them: it is what rejects a
 * mistyped `action('savee')` and makes a `switch` in `onClose` exhaustive.
 */
export type UseSlideModalOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<TData, SlideModalRenderContext<TData, TReason>, TReason> & {
  /** Slide direction */
  readonly direction: SlideDirection;
  /**
   * Alignment on the cross axis (perpendicular to the slide).
   * `stretch` (default) fills the cross axis; `start`/`center`/`end` pin a
   * content-sized panel — size it yourself in the `render` callback.
   * @default 'stretch'
   */
  readonly align?: SlideAlign | undefined;
};

/** Return type of `useSlideModal`. */
export type UseSlideModalReturn<TData = void, TReason extends string = string> = UseModalReturn<
  TData,
  TReason
>;

const SLIDE_TRANSFORMS: Record<SlideDirection, { entrance: string; exit: string }> = {
  left: { entrance: 'translateX(0)', exit: 'translateX(-100%)' },
  right: { entrance: 'translateX(0)', exit: 'translateX(100%)' },
  top: { entrance: 'translateY(0)', exit: 'translateY(-100%)' },
  bottom: { entrance: 'translateY(0)', exit: 'translateY(100%)' },
};

function getSlideAnimation(direction: SlideDirection, align: SlideAlign): ModalAnimation {
  const t = SLIDE_TRANSFORMS[direction];

  // `align: 'center'` positions the panel's cross-axis *edge* at the 50% mark, so it needs a
  // -50% self-shift to be truly centered. Transform is a single property, and the slide owns
  // it — so the cross-axis shift is folded into BOTH keyframes (constant across the animation)
  // instead of being set separately, where the slide would overwrite it.
  const crossShift =
    align === 'center'
      ? direction === 'left' || direction === 'right'
        ? ' translateY(-50%)'
        : ' translateX(-50%)'
      : '';

  return {
    entrance: { transform: `${t.entrance}${crossShift}` },
    exit: { transform: `${t.exit}${crossShift}` },
    duration: 300,
    exitDuration: 200,
    transitionProperty: 'transform',
  };
}

/**
 * Positioning styles for the slide `<dialog>`.
 *
 * @param direction - Edge the panel enters from.
 * @param contained - `true` for a non-modal, inline (non-portaled) dialog. It anchors to
 *   the library's `position: relative` wrapper via `absolute` and sizes to that container
 *   (`100%`) instead of the viewport (`100dvw`/`100dvh`) — see `useModal`'s contained mode.
 */
/**
 * Cross-axis placement for one direction + alignment.
 *
 * `stretch` pins both cross-axis edges (`0`/`0`) and forces the full cross size — the classic
 * edge-to-edge drawer. The other values pin a single edge (or center via `50%` + a 50%
 * self-offset) and leave the size to the content, so the panel is only as large as it needs.
 *
 * The centering offset is composed into the *base* transform rather than fighting the slide:
 * the slide animation drives the main axis only, so a cross-axis `translate` on the same
 * element would be overwritten. Instead `center` uses the margin-auto-free `inset` trick —
 * `top: 50%` plus `translateY(-50%)` folded into every keyframe (see `getSlideAnimation`).
 */
function getCrossAxisStyle(direction: SlideDirection, align: SlideAlign, contained: boolean) {
  const horizontalSlide = direction === 'left' || direction === 'right';
  const fullCross = contained ? '100%' : horizontalSlide ? '100dvh' : '100dvw';

  if (align === 'stretch') {
    return horizontalSlide
      ? { top: 0, bottom: 0, height: fullCross }
      : { left: 0, right: 0, width: fullCross };
  }

  const maxCross = { [horizontalSlide ? 'maxHeight' : 'maxWidth']: fullCross };

  if (align === 'center') {
    // Pin the cross-axis midpoint; the -50% self-shift is applied via the animation transform.
    return horizontalSlide ? { top: '50%', ...maxCross } : { left: '50%', ...maxCross };
  }

  const nearEdge = horizontalSlide ? 'top' : 'left';
  const farEdge = horizontalSlide ? 'bottom' : 'right';
  return { [align === 'start' ? nearEdge : farEdge]: 0, ...maxCross };
}

function getDialogStyle(
  direction: SlideDirection,
  contained: boolean,
  align: SlideAlign
): CSSProperties {
  // Each direction anchors to its own edge (`left`/`right`/`top`/`bottom: 0`). All four
  // insets are set explicitly (unused edges → `auto`) because non-modal dialogs receive
  // `inset: 0` from the core layer; leaving the opposite edge unset would let that `0`
  // leak in and over-constrain the box (e.g. `right: 0` + a leaked `left: 0` → full-width
  // instead of content-width). Anchoring at the near/far edge (not the far edge via
  // `left/top: 100%`) also keeps the available size full, so `auto` never collapses to zero.
  const base: CSSProperties = {
    position: contained ? 'absolute' : 'fixed',
    margin: 0,
    maxWidth: 'none',
    maxHeight: 'none',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
  };

  // Main axis: pin the edge the panel slides in from. Cross axis: `align`.
  const mainAxis: CSSProperties = { [direction]: 0 };

  return { ...base, ...mainAxis, ...getCrossAxisStyle(direction, align, contained) };
}

/**
 * Headless template hook for a slide-in panel modal.
 *
 * Automatically configures slide animation and dialog positioning based on the specified
 * direction. Users provide their own UI components.
 *
 * By default the panel stretches across the cross axis (a full-height side drawer or
 * full-width top/bottom sheet). Pass `align: 'start' | 'center' | 'end'` for a content-sized
 * panel pinned to that cross-axis position — e.g. a corner toast (`direction: 'right'`,
 * `align: 'start'`) or a centered command palette (`direction: 'top'`, `align: 'center'`).
 * With a non-stretch `align` you must size the panel yourself in `render`.
 *
 * @example
 * const panel = useSlideModal<void, 'close'>({
 *   id: 'settings-panel',
 *   direction: 'right',
 *   render: ({ direction, action }) => (
 *     <div style={{ height: '100%', background: '#fff' }}>
 *       <h2>Settings</h2>
 *       <p>Panel content</p>
 *       <button {...action.dom('close')}>Close</button>
 *     </div>
 *   ),
 * });
 */
export function useSlideModal<TData = void, TReason extends string = string>(
  options: UseSlideModalOptions<TData, TReason>
): UseSlideModalReturn<TData, TReason> {
  // Inline non-modal panels anchor to their container, not the viewport — see `useModal`.
  const contained = options.nonModal === true && options.portal !== true;
  const align = options.align ?? 'stretch';
  const dialogStyle = getDialogStyle(options.direction, contained, align);

  return useModal<TData, TReason>({
    ...buildModalOptions(options, {
      animation: getSlideAnimation(options.direction, align),
      style: dialogStyle,
      modalType: 'slide',
    }),
    // A slide enters/exits by translating past its container edge; clip the contained
    // wrapper so an off-screen (positive-translate) panel doesn't expand document overflow.
    clipContainer: true,
    render: (args) => {
      return options.render({ ...args, direction: options.direction });
    },
  });
}
