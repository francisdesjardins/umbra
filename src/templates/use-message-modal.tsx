import type { UseModalReturn } from '../core/types.js';
import { useModal } from '../core/use-modal.js';
import {
  DEFAULT_FADE_ANIMATION,
  buildModalOptions,
  type BaseRenderContext,
  type TemplateBaseOptions,
} from './shared.js';

/**
 * Context passed to the MessageModal render function.
 * Provides modal state and the close handle.
 *
 * @typeParam TData - The modal's close payload type.
 */
export type MessageModalRenderContext<TData = void> = BaseRenderContext<TData>;

/** Semantic intent of a message modal, used to drive icon and color selection in UI templates. */
export type MessageModalType = 'info' | 'warning' | 'error' | 'success';

/**
 * Options for `useMessageModal`.
 *
 * @typeParam TData - Typed data payload from close. Defaults to `void`, and is inferred from
 * `actions` when the action set declares one — see `defineAction`.
 */
export type UseMessageModalOptions<TData = void> = TemplateBaseOptions<
  TData,
  MessageModalRenderContext<TData>
>;

/** Return type of `useMessageModal`. */
export type UseMessageModalReturn<TData = void> = UseModalReturn<TData>;

/**
 * Headless template hook for a standard message/confirmation modal.
 *
 * Users provide their own UI components in the render callback and use
 * `useModalActions`'s callable pattern for async actions with per-button loading.
 *
 * @typeParam TData - Typed data payload from close. Defaults to `void`, and is inferred from
 * `actions` when the action set declares one — see `defineAction`. Pass it explicitly only for a
 * modal that has no actions, or whose payload travels through `handle.close`.
 *
 * @example
 * const actions = useModalActions({
 *   cancel: defineAction(),
 *   confirm: defineAction(),
 * });
 *
 * const modal = useMessageModal({
 *   id: 'delete-confirm',
 *   actions,
 *   render: ({ handle }) => (
 *     <div className="modal-container">
 *       <h2>Delete Item</h2>
 *       <p>Are you sure?</p>
 *       <button {...actions.cancel((close) => close())}>Cancel</button>
 *       <button
 *         {...actions.confirm(async (close) => {
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
export function useMessageModal<TData = void>(
  options: UseMessageModalOptions<TData>
): UseMessageModalReturn<TData> {
  return useModal<TData>({
    ...buildModalOptions(options, {
      animation: DEFAULT_FADE_ANIMATION,
      // Names itself, the way `useSlideModal` reports `'slide'`: `modalType` exists so a
      // cross-cutting listener can tell one kind of dialog from another, and a template that
      // inherits the generic default tells it nothing.
      modalType: 'message',
    }),
    render: ({ isPreparing, handle }) => {
      return options.render({ isPreparing, handle });
    },
  });
}
