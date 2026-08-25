import { mergeProps } from 'solid-js';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { JSX } from 'solid-js';
import type { DialogStyle } from '../../core/style.js';
import {
  slideAnimation,
  slideDialogStyle,
  type SlideAlign,
  type SlideDirection,
} from '../../templates/slide-geometry.js';
import {
  buildDialogOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';

export type { SlideAlign, SlideDirection };

/** Modal state, the close handle and the slide direction, passed to the render function. */
export type SlideDialogRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/** {@link SlideDialogRenderContext} for a declared id. */
export type RegisteredSlideContext<TId> = RegisteredBaseRenderContext<TId> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/** Options for `useSlideDialog` — declare both parameters on the hook, as React's twin says. */
export type UseSlideDialogOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  SlideDialogRenderContext<TData, TReason>,
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

/** Return type of `useSlideDialog`. */
export type UseSlideDialogReturn<TData = void, TReason extends string = string> = UseDialogReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a slide-in panel modal — `umbra/react`'s, and which edge it pins to
 * and how far it travels are `templates/slide-geometry.ts`'s, which neither binding owns.
 */
/**
 * The registered door, first so a declared id is matched by it. While `DialogRegistry` is empty
 * `RegisteredDialogId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useSlideDialog` has always had.
 */
export function useSlideDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredSlideContext<TId>, DialogStyle, JSX.Element> & {
    readonly direction: SlideDirection;
    readonly align?: SlideAlign | undefined;
  }
): RegisteredReturn<TId, JSX.Element>;
export function useSlideDialog<TData = void, TReason extends string = string>(
  options: UseSlideDialogOptions<TData, TReason>
): UseSlideDialogReturn<TData, TReason>;
export function useSlideDialog<TData = void, TReason extends string = string>(
  options: UseSlideDialogOptions<TData, TReason>
): UseSlideDialogReturn<TData, TReason> {
  // Inline non-modal panels anchor to their container, not the viewport — see `useDialog`.
  const contained = options.nonModal === true && options.portal !== true;
  const align = options.align ?? 'stretch';

  return useDialog<TData, TReason>({
    ...buildDialogOptions<
      TData,
      SlideDialogRenderContext<TData, TReason>,
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
