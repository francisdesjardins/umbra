import type { JSX } from 'solid-js';
import type { RegisteredDialogId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { DialogStyle } from '../../core/style.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildDialogOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';

/** Modal state and the close handle, passed to the MessageDialog render function. */
export type MessageDialogRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** Semantic intent of a message modal, used to drive icon and color selection in UI templates. */
export type MessageDialogType = 'info' | 'warning' | 'error' | 'success';

/** {@link MessageDialogRenderContext} for a declared id. */
export type RegisteredMessageContext<TId> = RegisteredBaseRenderContext<TId>;

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
 * Headless template hook for a standard message/confirmation modal — `umbra/react`'s, but for the
 * node type. Option mapping and fade animation are shared, in `templates/shared.ts`.
 */
/**
 * The registered door, first so a declared id is matched by it. While `DialogRegistry` is empty
 * `RegisteredDialogId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useMessageDialog` has always had.
 */
export function useMessageDialog<TId extends RegisteredDialogId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, DialogStyle, JSX.Element>
): RegisteredReturn<TId, JSX.Element>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason>;
export function useMessageDialog<TData = void, TReason extends string = string>(
  options: UseMessageDialogOptions<TData, TReason>
): UseMessageDialogReturn<TData, TReason> {
  return useDialog<TData, TReason>({
    // Spelled out because inference cannot reach through the `Omit` in `TemplateBaseOptions`.
    ...buildDialogOptions<
      TData,
      MessageDialogRenderContext<TData, TReason>,
      TReason,
      DialogStyle,
      JSX.Element
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
