import { mergeProps } from 'solid-js';
import type { JSX } from 'solid-js';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { DialogStyle } from '../../core/style.js';
import {
  slideDialogOptions,
  type RegisteredSlideContext,
  type RegisteredTemplateOptions,
  type SlideDialogRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';

// The geometry is `templates/slide-geometry.ts`'s and the render contexts are the template's —
// this file is the two knobs turned to Solid's, and nothing else.
export type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
import type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
export type { RegisteredSlideContext, SlideDialogRenderContext } from '../../templates/shared.js';

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
 * Headless template hook for a slide-in panel dialog — `umbra/react`'s, and which edge it pins to
 * and how far it travels are `templates/slide-geometry.ts`'s, which neither binding owns.
 */
/** The registered door — see {@link RegisteredDialogId} for why it is declared first. */
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
  return useDialog<TData, TReason>(
    // `mergeProps`, not a spread: the render args are getters, and spreading would freeze them —
    // the panel would never see `isPreparing` go false.
    slideDialogOptions<TData, TReason, DialogStyle, JSX.Element>(options, (args, extra) => {
      return mergeProps(args, extra);
    })
  );
}
