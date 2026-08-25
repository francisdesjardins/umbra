import type { DialogStyle } from '../core/style.js';
import type { CloseOf, DataOf, ReasonOf } from '../core/registry.js';
import type { RegisteredRenderArgs } from '../core/registered-types.js';
import type {
  CloseResult,
  ModalAnimation,
  ModalRenderArgs,
  ModalVariant,
  UseDialogBaseOptions,
} from '../core/types.js';

/**
 * Options common to all template hooks (useMessageModal, useSlideModal).
 *
 * Stated as the **complement** of what a template owns rather than a list of what it forwards, so a
 * new `UseDialogBaseOptions` option reaches every template by default and only a deliberate edit to
 * the exclusion list keeps it out; an enumeration of forwarded keys would let it reach no template
 * at all, with nothing to fail. The five exclusions: `id`, `render` and `onClose` are redeclared by
 * {@link TemplateBaseOptions} (`render` with the template's own context type), while `template` and
 * `clipContainer` are the template's to set. Intersected with `ModalVariant` directly, so the union
 * is not double-intersected the way omitting from `UseDialogOptions` would.
 *
 * @internal Not exported from index.ts.
 */
export type TemplateCommonOptions<
  TData = void,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = Omit<
  UseDialogBaseOptions<TData, TReason, TStyle, TNode>,
  'id' | 'render' | 'onClose' | 'template' | 'clipContainer'
> &
  ModalVariant;

/**
 * {@link TemplateCommonOptions} plus the `id`, `render` and `onClose` every template requires;
 * template-specific props (`direction`, `defaultValues`) are added by intersection per template.
 *
 * @typeParam TData - Close data payload type.
 * @typeParam TRenderContext - The template's render context type.
 *
 * @internal Not exported from index.ts.
 */
export type TemplateBaseOptions<
  TData,
  TRenderContext,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = TemplateCommonOptions<TData, TReason, TStyle, TNode> & {
  /** Unique modal identifier */
  readonly id: string;
  /** Render function receiving template-specific context */
  readonly render: (ctx: TRenderContext) => TNode;
  /** Called when the modal closes with the close result */
  readonly onClose?: ((result: CloseResult<TData, TReason>) => void | Promise<void>) | undefined;
};

/**
 * {@link TemplateBaseOptions} for a declared id: the same options, with `render` and `onClose`
 * carrying the contract's correlated close instead of one payload for every reason. Built over
 * {@link TemplateCommonOptions} so the exclusion list stays stated once.
 *
 * @internal Not exported from index.ts.
 */
export type RegisteredTemplateOptions<
  TId,
  TRenderContext,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
> = TemplateCommonOptions<DataOf<TId>, ReasonOf<TId>, TStyle, TNode> & {
  /** Unique modal identifier */
  readonly id: TId;
  /** Render function receiving template-specific context */
  readonly render: (ctx: TRenderContext) => TNode;
  /** Called when the modal closes, with the payload that reason declared */
  readonly onClose?: ((result: CloseOf<TId>) => void | Promise<void>) | undefined;
};

/** {@link BaseRenderContext} for a declared id — what every template's registered door forwards. */
export type RegisteredBaseRenderContext<TId> = RegisteredRenderArgs<TId>;

/**
 * Base context shared by all template render callbacks; template-specific contexts intersect this
 * with their extra fields (`useSlideModal` adds `direction`). It *is* `ModalRenderArgs`, not a copy,
 * because that is what templates forward — so a new render-time field is added once in the core and
 * no template can drift into a subtly different `isPreparing`.
 *
 * @typeParam TData - The modal's close payload, so a template's `handle.close` is as typed as
 * the core one.
 *
 * @internal Not exported from index.ts.
 */
export type BaseRenderContext<TData = void, TReason extends string = string> = ModalRenderArgs<
  TData,
  TReason
>;

/**
 * Default fade animation for useMessageModal; useSlideModal uses a direction-based slide instead.
 *
 * @internal Not exported from index.ts.
 */
export const DEFAULT_FADE_ANIMATION = {
  entrance: { opacity: 1 },
  exit: { opacity: 0 },
  duration: 300,
  exitDuration: 150,
  transitionProperty: 'opacity',
} satisfies ModalAnimation;

/**
 * The caller's structural styles over the template's, or whichever one exists. A function with a
 * declared return type rather than inline, because spreading `TStyle | undefined` twice in a literal
 * produces a union the checker will no longer call a `TStyle`.
 *
 * @internal Not exported from index.ts.
 */
function mergeStyle<TStyle extends DialogStyle>(
  base: TStyle | undefined,
  override: TStyle | undefined
): TStyle | undefined {
  if (base === undefined) {
    return override;
  }
  if (override === undefined) {
    return base;
  }
  return { ...base, ...override };
}

/**
 * Maps template options to `useDialog` options, applying the template's own animation, style and
 * name. A caller's `style` merges *over* the template's structural one rather than replacing it:
 * the placement makes it that template, but sizing is the caller's.
 *
 * @internal Not exported from index.ts.
 */
export function buildModalOptions<
  TData = void,
  TRenderContext = unknown,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
>(
  options: TemplateBaseOptions<TData, TRenderContext, TReason, TStyle, TNode>,
  defaults: {
    readonly animation: ModalAnimation<TStyle>;
    readonly style?: TStyle | undefined;
    readonly template?: UseDialogBaseOptions['template'];
  }
) {
  return {
    ...options,
    animation: options.animation ?? defaults.animation,
    style: mergeStyle(defaults.style, options.style),
    template: defaults.template,
  };
}
