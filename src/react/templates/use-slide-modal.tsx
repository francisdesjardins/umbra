import type { CSSProperties, ReactNode } from 'react';
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
  CSSProperties,
  ReactNode
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
 *       <button {...action('close')}>Close</button>
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

  return useModal<TData, TReason>({
    // Spelled out for the reason `useMessageModal` gives: inference cannot reach through the
    // `Omit` in `TemplateBaseOptions`, so the style and node parameters have to be stated.
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
    // A slide enters/exits by translating past its container edge; clip the contained
    // wrapper so an off-screen (positive-translate) panel doesn't expand document overflow.
    clipContainer: true,
    render: (args) => {
      return options.render({ ...args, direction: options.direction });
    },
  });
}
