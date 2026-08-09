import type { CSSProperties, ReactNode } from 'react';
import { useModal } from '../use-modal.js';
import type { UseModalReturn } from '../types.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildModalOptions,
  type BaseRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

/**
 * Context passed to the MessageModal render function.
 * Provides modal state and the close handle.
 *
 * @typeParam TData - The modal's close payload type.
 */
export type MessageModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** Semantic intent of a message modal, used to drive icon and color selection in UI templates. */
export type MessageModalType = 'info' | 'warning' | 'error' | 'success';

/**
 * Options for `useMessageModal`.
 *
 * @typeParam TData - Typed data payload from close. Defaults to `void`; declare it on the hook,
 * which is the one place it is stated.
 * @typeParam TReason - The reasons this modal closes with. Declare them: it is what rejects a
 * mistyped `action('confirmm')` and makes a `switch` in `onClose` exhaustive.
 */
export type UseMessageModalOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  MessageModalRenderContext<TData, TReason>,
  TReason,
  CSSProperties,
  ReactNode
>;

/** Return type of `useMessageModal`. */
export type UseMessageModalReturn<TData = void, TReason extends string = string> = UseModalReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation modal.
 *
 * Users provide their own UI components in the render callback and use
 * the `action` factory for async actions with per-button loading.
 *
 * @typeParam TData - Typed data payload from close. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with; declaring them rejects a mistyped
 * reason and makes a `switch` in `onClose` exhaustive.
 *
 * @example
 * const modal = useMessageModal<void, 'cancel' | 'confirm'>({
 *   id: 'delete-confirm',
 *   render: ({ action }) => (
 *     <div className="modal-container">
 *       <h2>Delete Item</h2>
 *       <p>Are you sure?</p>
 *       <button {...action('cancel', (close) => close())}>Cancel</button>
 *       <button
 *         {...action('confirm', async (close) => {
 *           await api.delete();
 *           close();
 *         })}
 *       >
 *         Confirm
 *       </button>
 *     </div>
 *   ),
 * });
 */
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason> {
  return useModal<TData, TReason>({
    // The type arguments are spelled out because `TemplateBaseOptions` is an `Omit`, and TS
    // cannot infer through a mapped type — left to inference, the style and node parameters fall
    // back to their framework-free defaults and the result stops being React's options.
    ...buildModalOptions<
      TData,
      MessageModalRenderContext<TData, TReason>,
      TReason,
      CSSProperties,
      ReactNode
    >(options, {
      animation: DEFAULT_FADE_ANIMATION,
      // Names itself, the way `useSlideModal` reports `'slide'`: `modalType` exists so a
      // cross-cutting listener can tell one kind of dialog from another, and a template that
      // inherits the generic default tells it nothing.
      modalType: 'message',
    }),
    render: (args) => {
      return options.render(args);
    },
  });
}
