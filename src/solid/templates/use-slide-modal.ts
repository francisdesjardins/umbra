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

/** Modal state, the close handle and the slide direction, passed to the render function. */
export type SlideModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/** Options for `useSlideModal` — declare both parameters on the hook, as React's twin says. */
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
   * `stretch` fills the cross axis, `start`/`center`/`end` pin a panel you size in `render`.
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
 * Headless template hook for a slide-in panel modal — `umbra/react`'s, and which edge it pins to
 * and how far it travels are `templates/slide-geometry.ts`'s, which neither binding owns.
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
      style: slideDialogStyle({ direction: options.direction, contained, align }),
      template: 'slide',
    }),
    // A slide translates past its container edge; clipping stops it expanding document overflow.
    clipContainer: true,
    // `mergeProps`, not a spread: the render args are getters, and spreading would freeze them —
    // the panel would never see `isPreparing` go false.
    render: (args) => {
      return options.render(mergeProps(args, { direction: options.direction }));
    },
  });
}
