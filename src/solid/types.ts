import type { JSX } from 'solid-js';
import type { DialogStyle } from '../core/style.js';
import type {
  ModalAnimation as ModalAnimationModel,
  UseModalBaseOptions as UseModalBaseOptionsModel,
  UseModalOptions as UseModalOptionsModel,
  UseModalReturn as UseModalReturnModel,
} from '../core/types.js';

/**
 * The Solid binding's half of the type model — the same two knobs `src/react/types.ts` turns,
 * turned to Solid.
 *
 * The node type is Solid's `JSX.Element`. The style type stays the core's own {@link DialogStyle}
 * rather than Solid's `JSX.CSSProperties`, and that is deliberate: Solid's style type is
 * *hyphenated* (`background-color`), because its `style` prop goes through
 * `element.style.setProperty`. This binding owns its `<dialog>` element and writes styles with
 * `applyStyle`, which speaks the camelCase form the rest of the library — `dialogPlacement`, the
 * slide geometry, `getDialogAnimationStyles` — is written in. One spelling across the whole
 * library beats matching a renderer's prop that this binding never uses.
 *
 * The one behavioural note that follows: a bare number is written verbatim, with no `px` added.
 * That is Solid's own semantics for `style`, not a divergence from it — write the unit.
 */

/** CSS transition configuration for modal entrance/exit animations. */
export type ModalAnimation = ModalAnimationModel;

/**
 * Variant-independent options for `useModal`. Does not include `nonModal` or
 * `dismissOnBackdropClick` — those live in `ModalVariant`.
 */
export type UseModalBaseOptions<
  TData = void,
  TReason extends string = string,
> = UseModalBaseOptionsModel<TData, TReason, DialogStyle, JSX.Element>;

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
  DialogStyle,
  JSX.Element
>;

/**
 * Return type of `useModal`.
 *
 * Shape-identical to React's, and live: `isVisible`, `isPreparing`, `hasRunningAction` and
 * `error` are getters over the modal's stores, so reading one inside JSX subscribes that one
 * expression to it. There is no re-render to wait for and no accessor to call — the property
 * *is* the reactive read.
 *
 * @typeParam TData - Type of the close data payload.
 */
export type UseModalReturn<TData = void, TReason extends string = string> = UseModalReturnModel<
  TData,
  TReason,
  JSX.Element
>;
