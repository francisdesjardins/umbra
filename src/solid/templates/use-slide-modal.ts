import { mergeProps } from 'solid-js';
import type { JSX } from 'solid-js';
import type { DialogStyle } from '../../core/style.js';
import {
  slideAnimation,
  slideDialogStyle,
  type SlideAlign,
  type SlideDirection,
} from '../../templates/slide-geometry.js';
import {
  buildModalOptions,
  type BaseRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useModal } from '../use-modal.js';
import type { UseModalReturn } from '../types.js';

export type { SlideAlign, SlideDirection };

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
> = TemplateBaseOptions<
  TData,
  SlideModalRenderContext<TData, TReason>,
  TReason,
  DialogStyle,
  JSX.Element
> & {
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

/**
 * Headless template hook for a slide-in panel modal.
 *
 * Configures the slide animation and the panel's positioning from the direction and alignment.
 * By default the panel stretches across the cross axis (a full-height side drawer or full-width
 * top/bottom sheet); pass `align: 'start' | 'center' | 'end'` for a content-sized panel pinned to
 * that cross-axis position, and size it yourself in `render`.
 *
 * Identical to `umbra/react`'s: which edge the panel is pinned to and how far it travels come
 * from `templates/slide-geometry.ts`, which neither binding owns.
 */
export function useSlideModal<TData = void, TReason extends string = string>(
  options: UseSlideModalOptions<TData, TReason>
): UseSlideModalReturn<TData, TReason> {
  // Inline non-modal panels anchor to their container, not the viewport — see `useModal`.
  const contained = options.nonModal === true && options.portal !== true;
  const align = options.align ?? 'stretch';

  return useModal<TData, TReason>({
    ...buildModalOptions<
      TData,
      SlideModalRenderContext<TData, TReason>,
      TReason,
      DialogStyle,
      JSX.Element
    >(options, {
      animation: slideAnimation(options.direction, align),
      style: slideDialogStyle(options.direction, contained, align),
      template: 'slide',
    }),
    // A slide enters/exits by translating past its container edge; clip the contained wrapper so
    // an off-screen (positive-translate) panel doesn't expand document overflow.
    clipContainer: true,
    // `mergeProps`, not a spread. The render args are getters over the modal's stores, and
    // spreading them would read each one once and hand the template a frozen copy — the panel
    // would never see `isPreparing` go false. `mergeProps` forwards the access instead.
    render: (args) => {
      return options.render(mergeProps(args, { direction: options.direction }));
    },
  });
}
