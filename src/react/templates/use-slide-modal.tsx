import type { CSSProperties, ReactNode } from 'react';
import type { DataOf, ReasonOf, RegisteredModalId } from '../../core/registry.js';
import type { UseModalReturn } from '../types.js';
import { useModal } from '../use-modal.js';
import { slideAnimation, slideDialogStyle } from '../../templates/slide-geometry.js';
import {
  buildModalOptions,
  type BaseRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

export type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';
import type { SlideAlign, SlideDirection } from '../../templates/slide-geometry.js';

/** Modal state, the close handle and the slide direction, passed to the render function. */
export type SlideModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/**
 * Options for `useSlideModal`.
 * @typeParam TData - Typed data payload from close, declared here and nowhere else. Default `void`.
 * @typeParam TReason - The reasons this panel closes with; declare them, see `useModal`.
 */
export type UseSlideModalOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  SlideModalRenderContext<TData, TReason>,
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

/** Return type of `useSlideModal`. */
export type UseSlideModalReturn<TData = void, TReason extends string = string> = UseModalReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a slide-in panel modal: it configures the slide animation and the
 * dialog's positioning from the direction, and you bring the UI. By default the panel stretches
 * across the cross axis (a full-height side drawer or full-width top/bottom sheet); a non-stretch
 * `align` pins a content-sized one — a corner toast, a palette — that you size in `render`.
 *
 * @example
 * const panel = useSlideModal<void, 'close'>({
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
 * The registered door, first so a declared id is matched by it. While `ModalRegistry` is empty
 * `RegisteredModalId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useSlideModal` has always had.
 */
export function useSlideModal<TId extends RegisteredModalId>(
  options: UseSlideModalOptions<DataOf<TId>, ReasonOf<TId>> & { readonly id: TId }
): UseSlideModalReturn<DataOf<TId>, ReasonOf<TId>>;
export function useSlideModal<TData = void, TReason extends string = string>(
  options: UseSlideModalOptions<TData, TReason>
): UseSlideModalReturn<TData, TReason>;
export function useSlideModal<TData = void, TReason extends string = string>(
  options: UseSlideModalOptions<TData, TReason>
): UseSlideModalReturn<TData, TReason> {
  // Inline non-modal panels anchor to their container, not the viewport — see `useModal`.
  const contained = options.nonModal === true && options.portal !== true;
  const align = options.align ?? 'stretch';

  return useModal<TData, TReason>({
    // Spelled out for the reason `useMessageModal` gives.
    ...buildModalOptions<
      TData,
      SlideModalRenderContext<TData, TReason>,
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
