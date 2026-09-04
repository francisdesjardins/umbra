import type { CSSProperties, ReactNode } from 'react';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { UseDialogReturn } from '../types.js';
import { useDialog } from '../use-dialog.js';
import {
  slideDialogOptions,
  type RegisteredSlideContext,
  type RegisteredTemplateOptions,
  type SlideDialogRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

// The geometry is `templates/slide-geometry.ts`'s and the render contexts are the template's —
// this file is the two knobs turned to React's, and nothing else.
export type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
import type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
export type { RegisteredSlideContext, SlideDialogRenderContext } from '../../templates/shared.js';

/**
 * Options for `useSlideDialog`.
 * @typeParam TData - Typed data payload from close, declared here and nowhere else. Default `void`.
 * @typeParam TReason - The reasons this panel closes with; declare them, see `useDialog`.
 */
export type UseSlideDialogOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  SlideDialogRenderContext<TData, TReason>,
  TReason,
  CSSProperties,
  ReactNode
> & {
  /** Slide direction */
  readonly direction: SlideDirection;
  /**
   * Alignment on the cross axis: `stretch` fills it, `start`/`center`/`end` pin a content-sized
   * panel you size yourself in `render`.
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
 * Headless template hook for a slide-in panel dialog: it configures the slide animation and the
 * dialog's positioning from the direction, and you bring the UI. By default the panel stretches
 * across the cross axis (a full-height side drawer or full-width top/bottom sheet); a non-stretch
 * `align` pins a content-sized one — a corner toast, a palette — that you size in `render`.
 *
 * @example
 * const panel = useSlideDialog<void, 'close'>({
 *   id: 'settings-panel',
 *   direction: 'right',
 *   render: ({ direction, action }) => (
 *     <div style={{ height: '100%', background: '#fff' }}>
 *       <h2>Settings</h2>
 *       <p>Panel content</p>
 *       <button {...action('close')}>Close</button>
 *     </div>
 *   ),
 * });
 */
/** The registered door — see {@link RegisteredDialogId} for why it is declared first. */
export function useSlideDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredSlideContext<TId>, CSSProperties, ReactNode> & {
    readonly direction: SlideDirection;
    readonly align?: SlideAlign | undefined;
  }
): RegisteredReturn<TId, ReactNode>;
export function useSlideDialog<TData = void, TReason extends string = string>(
  options: UseSlideDialogOptions<TData, TReason>
): UseSlideDialogReturn<TData, TReason>;
export function useSlideDialog<TData = void, TReason extends string = string>(
  options: UseSlideDialogOptions<TData, TReason>
): UseSlideDialogReturn<TData, TReason> {
  return useDialog<TData, TReason>(
    // A spread, where Solid's twin must use `mergeProps`: React's render args are plain values.
    slideDialogOptions<TData, TReason, CSSProperties, ReactNode>(options, (args, extra) => {
      return { ...args, ...extra };
    })
  );
}
