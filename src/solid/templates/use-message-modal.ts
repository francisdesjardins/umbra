import type { JSX } from 'solid-js';
import type { DialogStyle } from '../../core/style.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildModalOptions,
  type BaseRenderContext,
  type TemplateBaseOptions,
} from '../../templates/shared.js';
import { useModal } from '../use-modal.js';
import type { UseModalReturn } from '../types.js';

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
  DialogStyle,
  JSX.Element
>;

/** Return type of `useMessageModal`. */
export type UseMessageModalReturn<TData = void, TReason extends string = string> = UseModalReturn<
  TData,
  TReason
>;

/**
 * Headless template hook for a standard message/confirmation modal.
 *
 * Users provide their own UI in the render callback and use the `action` factory for async
 * actions with per-button loading. Identical to `umbra/react`'s in everything but the node type:
 * the option mapping and the fade animation are the shared ones in `templates/shared.ts`.
 */
export function useMessageModal<TData = void, TReason extends string = string>(
  options: UseMessageModalOptions<TData, TReason>
): UseMessageModalReturn<TData, TReason> {
  return useModal<TData, TReason>({
    // Type arguments spelled out for the reason React's templates give: inference cannot reach
    // through the `Omit` in `TemplateBaseOptions`.
    ...buildModalOptions<
      TData,
      MessageModalRenderContext<TData, TReason>,
      TReason,
      DialogStyle,
      JSX.Element
    >(options, {
      animation: DEFAULT_FADE_ANIMATION,
      // Names itself, the way `useSlideModal` reports `'slide'`: `modalType` exists so a
      // cross-cutting listener can tell one kind of dialog from another.
      modalType: 'message',
    }),
    render: (args) => {
      return options.render(args);
    },
  });
}
