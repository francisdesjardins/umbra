import type { CSSProperties, ReactNode } from 'react';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildDialogOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

/** Dialog state and the close handle, passed to the MessageDialog render function. */
export type MessageDialogRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** Semantic intent of a message dialog, driving icon and color selection in UI templates. */
export type MessageDialogType = 'info' | 'warning' | 'error' | 'success';

/** {@link MessageDialogRenderContext} for a declared id. */
export type RegisteredMessageContext<TId> = RegisteredBaseRenderContext<TId>;

/**
 * Options for `useMessageDialog`.
 * @typeParam TData - Typed data payload from close, declared here and nowhere else. Default `void`.
 * @typeParam TReason - The reasons this dialog closes with; declare them, see `useDialog`.
 */
export type UseMessageDialogOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  MessageDialogRenderContext<TData, TReason>,
  TReason,
  CSSProperties,
  ReactNode
>;

/** Return type of `useMessageDialog`. */
export type UseMessageDialogReturn<TData = void, TReason extends string = string> = UseDialogReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation dialog. Bring your own UI in the
 * render callback and use the `action` factory for async actions with per-button loading.
 * @typeParam TData - Typed data payload from close. Defaults to `void`.
 * @typeParam TReason - The reasons this dialog closes with; declare them, see `useDialog`.
 * @example
 * const dialog = useMessageDialog<void, 'cancel' | 'confirm'>({
 *   id: 'delete-confirm',
 *   render: ({ action }) => (
 *     <div className="dialog-container">
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
 * The registered door, first so a declared id is matched by it. While `DialogRegistry` is empty
 * `RegisteredDialogId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useMessageDialog` has always had.
 */
export function useMessageDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, CSSProperties, ReactNode>
): RegisteredReturn<TId, ReactNode>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason> {
  return useDialog<TData, TReason>({
    // Spelled out because `TemplateBaseOptions` is an `Omit` and inference cannot reach through a
    // mapped type: left alone, style and node fall back to their framework-free defaults.
    ...buildDialogOptions<
      TData,
      MessageDialogRenderContext<TData, TReason>,
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
