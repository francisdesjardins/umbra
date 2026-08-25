import type { CSSProperties, ReactNode } from 'react';
import type {
  DialogAnimation as DialogAnimationModel,
  UseDialogBaseOptions as UseDialogBaseOptionsModel,
  UseDialogOptions as UseDialogOptionsModel,
  UseDialogReturn as UseDialogReturnModel,
} from '../core/types.js';

/**
 * The React binding's half of the type model: the two knobs `core/types.ts` leaves open — style
 * (`CSSProperties`) and node (`ReactNode`). Pinning them is all that makes these React's, and why
 * the Solid binding is four aliases rather than a second copy of the model.
 */

/**
 * CSS transition configuration for modal entrance/exit animations.
 * @example
 * const fade: DialogAnimation = {
 *   entrance: { opacity: 1, transform: 'scale(1)' },
 *   exit: { opacity: 0, transform: 'scale(0.95)' },
 *   duration: 200,
 *   transitionProperty: 'opacity, transform',
 * };
 */
export type DialogAnimation = DialogAnimationModel<CSSProperties>;

/**
 * Variant-independent options for `useDialog`: `nonModal` and `dismissOnBackdropClick` live in
 * `DialogVariant`, `UseDialogOptions` intersects the two, template hooks `Pick` from this flat one.
 */
export type UseDialogBaseOptions<
  TData = void,
  TReason extends string = string,
> = UseDialogBaseOptionsModel<TData, TReason, CSSProperties, ReactNode>;

/**
 * Options for `useDialog`.
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 * @typeParam TReason - The reasons this modal closes with. Declare them: the `string` default
 * accepts anything, costing the typo-safety and exhaustive `switch` the design exists for.
 */
export type UseDialogOptions<TData = void, TReason extends string = string> = UseDialogOptionsModel<
  TData,
  TReason,
  CSSProperties,
  ReactNode
>;

/**
 * Return type of `useDialog`.
 * @typeParam TData - Type of the close data payload.
 * @example
 * function DeleteButton() {
 *   const { openAndWait, Modal } = useDialog<boolean>({
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
export type UseDialogReturn<TData = void, TReason extends string = string> = UseDialogReturnModel<
  TData,
  TReason,
  ReactNode
>;
