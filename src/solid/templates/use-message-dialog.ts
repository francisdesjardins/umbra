import type { JSX } from 'solid-js';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { DialogStyle } from '../../core/style.js';
import {
  messageDialogOptions,
  type MessageDialogRenderContext,
  type RegisteredMessageContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';

// The render contexts and the option mapping are the template's, not the renderer's — this file is
// the two knobs turned to Solid's, and nothing else.
export type {
  MessageDialogRenderContext,
  MessageDialogType,
  RegisteredMessageContext,
} from '../../templates/shared.js';

/** Options for `useMessageDialog` — declare both parameters on the hook, as React's twin says. */
export type UseMessageDialogOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  MessageDialogRenderContext<TData, TReason>,
  TReason,
  DialogStyle,
  JSX.Element
>;

/** Return type of `useMessageDialog`. */
export type UseMessageDialogReturn<TData = void, TReason extends string = string> = UseDialogReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation dialog — `umbra/react`'s, but for the
 * node type. Option mapping and fade animation are shared, in `templates/shared.ts`.
 */
/** The registered door — see {@link RegisteredDialogId} for why it is declared first. */
export function useMessageDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, DialogStyle, JSX.Element>
): RegisteredReturn<TId, JSX.Element>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason> {
  return useDialog<TData, TReason>(
    messageDialogOptions<TData, TReason, DialogStyle, JSX.Element>(options)
  );
}
