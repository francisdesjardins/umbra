import type { CSSProperties, ReactNode } from 'react';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';
import {
  messageDialogOptions,
  type MessageDialogRenderContext,
  type RegisteredMessageContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';

// The render contexts and the option mapping are the template's, not the renderer's — this file is
// the two knobs turned to React's, and nothing else.
export type {
  MessageDialogRenderContext,
  MessageDialogType,
  RegisteredMessageContext,
} from '../../templates/shared.js';

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
/** The registered door — see {@link RegisteredDialogId} for why it is declared first. */
export function useMessageDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, CSSProperties, ReactNode>
): RegisteredReturn<TId, ReactNode>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason> {
  return useDialog<TData, TReason>(
    messageDialogOptions<TData, TReason, CSSProperties, ReactNode>(options)
  );
}
