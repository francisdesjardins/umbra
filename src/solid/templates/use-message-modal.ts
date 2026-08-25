import type { JSX } from 'solid-js';
import type { RegisteredModalId } from '../../core/registry.js';
import type { RegisteredReturn } from '../../core/registered-types.js';
import type { DialogStyle } from '../../core/style.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildModalOptions,
  type BaseRenderContext,
  type RegisteredBaseRenderContext,
  type RegisteredTemplateOptions,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useDialog } from '../use-dialog.js';
import type { UseDialogReturn } from '../types.js';

/** Modal state and the close handle, passed to the MessageModal render function. */
export type MessageModalRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** Semantic intent of a message modal, used to drive icon and color selection in UI templates. */
export type MessageModalType = 'info' | 'warning' | 'error' | 'success';

/** {@link MessageModalRenderContext} for a declared id. */
export type RegisteredMessageContext<TId> = RegisteredBaseRenderContext<TId>;

/** Options for `useMessageModal` — declare both parameters on the hook, as React's twin says. */
export type UseMessageModalOptions<
  TData = void,
  TReason extends string = string,
> = TemplateBaseOptions<
  TData,
  MessageModalRenderContext<TData, TReason>,
  TReason,
  DialogStyle,
  JSX.Element
>;

/** Return type of `useMessageModal`. */
export type UseMessageModalReturn<TData = void, TReason extends string = string> = UseDialogReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation modal — `umbra/react`'s, but for the
 * node type. Option mapping and fade animation are shared, in `templates/shared.ts`.
 */
/**
 * The registered door, first so a declared id is matched by it. While `ModalRegistry` is empty
 * `RegisteredModalId` is `never`, the overload is uninhabitable, and every call falls through to
 * the one below — which is the signature `useMessageModal` has always had.
 */
export function useMessageModal<TId extends RegisteredModalId>(
  options: RegisteredTemplateOptions<TId, RegisteredMessageContext<TId>, DialogStyle, JSX.Element>
): RegisteredReturn<TId, JSX.Element>;
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason>;
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason> {
  return useDialog<TData, TReason>({
    // Spelled out because inference cannot reach through the `Omit` in `TemplateBaseOptions`.
    ...buildModalOptions<
      TData,
      MessageModalRenderContext<TData, TReason>,
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
