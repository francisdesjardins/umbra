import type { CSSProperties, ReactNode } from 'react';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { UseDialogReturn } from '../types.js';
import { useDialog } from '../use-dialog.js';
import { slideAnimation, slideDialogStyle } from '../../templates/slide-geometry.js';
import {
  buildDialogOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

export type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
import type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';

/** Dialog state, the close handle and the slide direction, passed to the render function. */
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
/**
 * The registered door, first so a declared id is matched by it. While `DialogRegistry` is empty
 * `RegisteredDialogId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useSlideDialog` has always had.
 */
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
  // Inline non-modal panels anchor to their container, not the viewport — see `useDialog`.
  const contained = options.nonModal === true && options.portal !== true;
  const align = options.align ?? 'stretch';

  return useDialog<TData, TReason>({
    // Spelled out for the reason `useMessageDialog` gives.
    ...buildDialogOptions<
      TData,
      SlideDialogRenderContext<TData, TReason>,
      TReason,
      CSSProperties,
      ReactNode
    >(options, {
      animation: slideAnimation(options.direction, align),
      style: slideDialogStyle({ direction: options.direction, contained, align }),
      template: 'slide',
    }),
    // A slide translates past its container edge, so the wrapper is clipped to stop an off-screen
    // panel expanding document overflow.
    clipContainer: true,
    render: (args) => {
      return options.render({ ...args, direction: options.direction });
    },
  });
}
