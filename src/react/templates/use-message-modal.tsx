import type { CSSProperties, ReactNode } from 'react';
import type { RegisteredModalId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildModalOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

/** Modal state and the close handle, passed to the MessageModal render function. */
export type MessageModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** Semantic intent of a message modal, used to drive icon and color selection in UI templates. */
export type MessageModalType = 'info' | 'warning' | 'error' | 'success';

/** {@link MessageModalRenderContext} for a declared id. */
export type RegisteredMessageContext<TId> = RegisteredBaseRenderContext<TId>;

/**
 * Options for `useMessageModal`.
 * @typeParam TData - Typed data payload from close, declared here and nowhere else. Default `void`.
 * @typeParam TReason - The reasons this modal closes with; declare them, see `useDialog`.
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
export type UseMessageModalReturn<TData = void, TReason extends string = string> = UseDialogReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation modal. Bring your own UI in the
 * render callback and use the `action` factory for async actions with per-button loading.
 * @typeParam TData - Typed data payload from close. Defaults to `void`.
 * @typeParam TReason - The reasons this modal closes with; declare them, see `useDialog`.
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
/**
 * The registered door, first so a declared id is matched by it. While `ModalRegistry` is empty
 * `RegisteredModalId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useMessageModal` has always had.
 */
export function useMessageModal<TId extends RegisteredModalId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, CSSProperties, ReactNode>
): RegisteredReturn<TId, ReactNode>;
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason>;
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason> {
  return useDialog<TData, TReason>({
    // Spelled out because `TemplateBaseOptions` is an `Omit` and inference cannot reach through a
    // mapped type: left alone, style and node fall back to their framework-free defaults.
    ...buildModalOptions<
      TData,
      MessageModalRenderContext<TData, TReason>,
      TReason,
      CSSProperties,
      ReactNode
    >(options, {
      animation: DEFAULT_FADE_ANIMATION,
      // Names itself, so a cross-cutting listener can tell one kind of dialog from another.
      template: 'message',
    }),
    render: (args) => {
      return options.render(args);
    },
  });
}
