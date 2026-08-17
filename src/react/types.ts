import type { CSSProperties, ReactNode } from 'react';
import type {
  ModalAnimation as ModalAnimationModel,
  UseModalBaseOptions as UseModalBaseOptionsModel,
  UseModalOptions as UseModalOptionsModel,
  UseModalReturn as UseModalReturnModel,
} from '../core/types.js';

/**
 * The React binding's half of the type model: the two knobs `core/types.ts` leaves open — style
 * (`CSSProperties`) and node (`ReactNode`). Pinning them is all that makes these React's, and why
 * the Solid binding is four aliases rather than a second copy of the model.
 */

/**
 * CSS transition configuration for modal entrance/exit animations.
 * @example
 * const fade: ModalAnimation = {
 *   entrance: { opacity: 1, transform: 'scale(1)' },
 *   exit: { opacity: 0, transform: 'scale(0.95)' },
 *   duration: 200,
 *   transitionProperty: 'opacity, transform',
 * };
 */
export type ModalAnimation = ModalAnimationModel<CSSProperties>;

/**
 * Variant-independent options for `useModal`: `nonModal` and `dismissOnBackdropClick` live in
 * `ModalVariant`, `UseModalOptions` intersects the two, template hooks `Pick` from this flat one.
 */
export type UseModalBaseOptions<
  TData = void,
  TReason extends string = string,
> = UseModalBaseOptionsModel<TData, TReason, CSSProperties, ReactNode>;

/**
 * Options for `useModal`.
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 * @typeParam TReason - The reasons this modal closes with. Declare them: the `string` default
 * accepts anything, costing the typo-safety and exhaustive `switch` the design exists for.
 */
export type UseModalOptions<TData = void, TReason extends string = string> = UseModalOptionsModel<
  TData,
  TReason,
  CSSProperties,
  ReactNode
>;

/**
 * Return type of `useModal`.
 * @typeParam TData - Type of the close data payload.
 * @example
 * function DeleteButton() {
 *   const { openAndWait, Modal } = useModal<boolean>({
 *     id: 'confirm-delete',
 *     render: ({ handle, action }) => {
 *       return <button onClick={() => handle.close('confirm', true)}>Yes, delete</button>;
 *     },
 *   });
 *
 *   const ask = async () => {
 *     const [error, result] = await openAndWait();
 *     return error === null && result.data === true;
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => void ask()}>Delete</button>
 *       {Modal}
 *     </>
 *   );
 * }
 */
export type UseModalReturn<TData = void, TReason extends string = string> = UseModalReturnModel<
  TData,
  TReason,
  ReactNode
>;
