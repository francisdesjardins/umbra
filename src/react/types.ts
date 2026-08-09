import type { CSSProperties, ReactNode } from 'react';
import type {
  ModalAnimation as ModalAnimationModel,
  UseModalBaseOptions as UseModalBaseOptionsModel,
  UseModalOptions as UseModalOptionsModel,
  UseModalReturn as UseModalReturnModel,
} from '../core/types.js';

/**
 * The React binding's half of the type model: the two knobs `core/types.ts` left open, turned to
 * React.
 *
 * Everything else about a dialog is the same in every framework and is declared once in the core.
 * What is not: the type of a style object (`CSSProperties`) and the type of a rendered node
 * (`ReactNode`). Pinning them here is the whole of what makes these React's types — and it is why
 * the Solid binding is a second file of four aliases rather than a second copy of the model.
 */

/**
 * CSS transition configuration for modal entrance/exit animations.
 *
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
 * Variant-independent options for `useModal`. Does not include `nonModal` or
 * `dismissOnBackdropClick` — those live in `ModalVariant`.
 *
 * `UseModalOptions` is `UseModalBaseOptions & ModalVariant`; template hooks
 * also `Pick` from this flat type without intersecting with `ModalVariant`.
 */
export type UseModalBaseOptions<
  TData = void,
  TReason extends string = string,
> = UseModalBaseOptionsModel<TData, TReason, CSSProperties, ReactNode>;

/**
 * Options for `useModal`.
 *
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 * @typeParam TReason - The reasons this modal closes with. Declare them — the `string` default
 * accepts any reason, which costs the typo-safety and the exhaustive `switch` the design exists
 * for.
 */
export type UseModalOptions<TData = void, TReason extends string = string> = UseModalOptionsModel<
  TData,
  TReason,
  CSSProperties,
  ReactNode
>;

/**
 * Return type of `useModal`.
 *
 * @typeParam TData - Type of the close data payload.
 *
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
