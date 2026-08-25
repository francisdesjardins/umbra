import type { JSX } from 'solid-js';
import type { DialogStyle } from '../core/style.js';
import type {
  DialogAnimation as DialogAnimationModel,
  UseDialogBaseOptions as UseDialogBaseOptionsModel,
  UseDialogOptions as UseDialogOptionsModel,
  UseDialogReturn as UseDialogReturnModel,
} from '../core/types.js';

/**
 * The Solid binding's half of the type model — the same two knobs `src/react/types.ts` turns. Nodes
 * are `JSX.Element`; styles stay the core's {@link DialogStyle} rather than Solid's *hyphenated*
 * `JSX.CSSProperties`, because this binding owns its `<dialog>` and writes through `applyStyle`, in
 * the library's camelCase. A bare number is written verbatim, Solid's own semantics: write the unit.
 */

/** CSS transition configuration for modal entrance/exit animations. */
export type DialogAnimation = DialogAnimationModel;

/** Variant-independent options for `useDialog`; `nonModal` and friends live in `DialogVariant`. */
export type UseDialogBaseOptions<
  TData = void,
  TReason extends string = string,
> = UseDialogBaseOptionsModel<TData, TReason, DialogStyle, JSX.Element>;

/**
 * Options for `useDialog`.
 * @typeParam TData - Type of the close data payload. Defaults to void (no data).
 * @typeParam TReason - The reasons this modal closes with; declare them, see `useDialog`.
 */
export type UseDialogOptions<TData = void, TReason extends string = string> = UseDialogOptionsModel<
  TData,
  TReason,
  DialogStyle,
  JSX.Element
>;

/**
 * Return type of `useDialog`. Shape-identical to React's, and live: `isVisible`, `isPreparing`,
 * `hasRunningAction` and `error` are getters over the modal's stores, so the property *is* the
 * reactive read — reading one inside JSX subscribes that expression, with no accessor to call.
 * @typeParam TData - Type of the close data payload.
 */
export type UseDialogReturn<TData = void, TReason extends string = string> = UseDialogReturnModel<
  TData,
  TReason,
  JSX.Element
>;
