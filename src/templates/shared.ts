import { isContainedArrangement } from '../core/placement.js';
import {
  slideAnimation,
  slideDialogStyle,
  type SlideAlign,
  type SlideDirection,
} from './slide-geometry.js';
import type { DialogStyle } from '../core/style.js';
import type { CloseOf, DataOf, ReasonOf } from '../core/registry.js';
import type { RegisteredRenderArgs } from '../core/registered-types.js';
import type {
  CloseResult,
  DialogAnimation,
  DialogRenderArgs,
  DialogVariant,
  UseDialogBaseOptions,
} from '../core/types.js';

/**
 * Options common to all template hooks (useMessageDialog, useSlideDialog).
 *
 * Stated as the **complement** of what a template owns rather than a list of what it forwards, so a
 * new `UseDialogBaseOptions` option reaches every template by default and only a deliberate edit to
 * the exclusion list keeps it out; an enumeration of forwarded keys would let it reach no template
 * at all, with nothing to fail. The five exclusions: `id`, `render` and `onClose` are redeclared by
 * {@link TemplateBaseOptions} (`render` with the template's own context type), while `template` and
 * `clipContainer` are the template's to set. Intersected with `DialogVariant` directly, so the union
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
  DialogVariant;

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
  /** Unique dialog identifier */
  readonly id: string;
  /** Render function receiving template-specific context */
  readonly render: (ctx: TRenderContext) => TNode;
  /** Called when the dialog closes with the close result */
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
  /** Unique dialog identifier */
  readonly id: TId;
  /** Render function receiving template-specific context */
  readonly render: (ctx: TRenderContext) => TNode;
  /** Called when the dialog closes, with the payload that reason declared */
  readonly onClose?: ((result: CloseOf<TId>) => void | Promise<void>) | undefined;
};

/** {@link BaseRenderContext} for a declared id — what every template's registered door forwards. */
export type RegisteredBaseRenderContext<TId> = RegisteredRenderArgs<TId>;

/**
 * Base context shared by all template render callbacks; template-specific contexts intersect this
 * with their extra fields (`useSlideDialog` adds `direction`). It *is* `DialogRenderArgs`, not a copy,
 * because that is what templates forward — so a new render-time field is added once in the core and
 * no template can drift into a subtly different `isPreparing`.
 *
 * @typeParam TData - The dialog's close payload, so a template's `handle.close` is as typed as
 * the core one.
 *
 * @internal Not exported from index.ts.
 */
export type BaseRenderContext<TData = void, TReason extends string = string> = DialogRenderArgs<
  TData,
  TReason
>;

/**
 * Default fade animation for useMessageDialog; useSlideDialog uses a direction-based slide instead.
 *
 * @internal Not exported from index.ts.
 */
export const DEFAULT_FADE_ANIMATION = {
  entrance: { opacity: 1 },
  exit: { opacity: 0 },
  duration: 300,
  exitDuration: 150,
  transitionProperty: 'opacity',
} satisfies DialogAnimation;

/**
 * The caller's structural styles over the template's, or whichever one exists. A function with a
 * declared return type rather than inline, because spreading `TStyle | undefined` twice in a literal
 * produces a union the checker will no longer call a `TStyle`.
 *
 * @internal Not exported from index.ts.
 */
function mergeStyle<TStyle extends DialogStyle, TBase extends DialogStyle>(
  base: TBase | undefined,
  override: TStyle | undefined
): TStyle | TBase | (TBase & TStyle) | undefined {
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
 * The two default styles are **inferred rather than fixed to `TStyle`**, which is what lets the
 * mapping be shared: a literal is never assignable to a type parameter, and a template's defaults
 * are literals. Two of them, the slide's being two types. **Pass no type argument here** — one
 * given makes the rest fall back to `TStyle`, and the literals stop fitting.
 *
 * @internal Not exported from index.ts.
 */
export function buildDialogOptions<
  TData = void,
  TRenderContext = unknown,
  TReason extends string = string,
  TStyle extends DialogStyle = DialogStyle,
  TNode = unknown,
  TDefaultAnimation extends DialogStyle = TStyle,
  TDefaultStyle extends DialogStyle = TStyle,
>(
  options: TemplateBaseOptions<TData, TRenderContext, TReason, TStyle, TNode>,
  defaults: {
    readonly animation: DialogAnimation<TDefaultAnimation>;
    readonly style?: TDefaultStyle | undefined;
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

// ── The render contexts, and the two option mappings that produce them ────────

/** Semantic intent of a message dialog, driving icon and color selection in UI templates. */
export type MessageDialogType = 'info' | 'warning' | 'error' | 'success';

/** Dialog state and the close handle, passed to the MessageDialog render function. */
export type MessageDialogRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason>;

/** {@link MessageDialogRenderContext} for a declared id. */
export type RegisteredMessageContext<TId> = RegisteredBaseRenderContext<TId>;

/** Dialog state, the close handle and the slide direction, passed to the render function. */
export type SlideDialogRenderContext<
  TData = void,
  TReason extends string = string,
> = BaseRenderContext<TData, TReason> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/** {@link SlideDialogRenderContext} for a declared id. */
export type RegisteredSlideContext<TId> = RegisteredBaseRenderContext<TId> & {
  /** The slide direction for direction-aware layout */
  readonly direction: SlideDirection;
};

/**
 * The two knobs the slide's own options add to {@link TemplateBaseOptions}.
 *
 * **Not exported, and each binding spells the pair out again in its public `UseSlideDialogOptions`**
 * — measured, not assumed: typedoc renders a referenced alias as a bare name, so sharing the
 * declaration there cost `direction` and `align` their entries in the reference. Neither `@inline`
 * nor `@inlineType` inlines it (0.28.20; `@inline` silences the `notExported` warning without
 * inlining, which is worse than the gap). So this is the mapping's parameter type and nothing more.
 *
 * @internal Not exported from index.ts.
 */
type SlideTemplateExtras = {
  /** Slide direction */
  readonly direction: SlideDirection;
  /**
   * Alignment on the cross axis: `stretch` fills it, `start`/`center`/`end` pin a content-sized
   * panel you size yourself in `render`.
   * @default 'stretch'
   */
  readonly align?: SlideAlign | undefined;
};

/**
 * The message template's whole option mapping: the fade, the name, and `render` restated against
 * the template's own context.
 *
 * Here rather than in each binding because the two bodies were identical to the letter — the only
 * thing that differed was which pair of knobs they instantiated, and those are type arguments. The
 * four are spelled out at every call site for the reason {@link buildDialogOptions} gives:
 * `TemplateBaseOptions` is an `Omit`, and inference cannot reach a mapped type's knobs.
 *
 * @internal Not exported from index.ts.
 */
export function messageDialogOptions<
  TData,
  TReason extends string,
  TStyle extends DialogStyle,
  TNode,
>(
  options: TemplateBaseOptions<
    TData,
    MessageDialogRenderContext<TData, TReason>,
    TReason,
    TStyle,
    TNode
  >
) {
  return {
    ...buildDialogOptions(options, {
      animation: DEFAULT_FADE_ANIMATION,
      // Names itself, so a cross-cutting listener can tell one kind of dialog from another.
      template: 'message',
    }),
    render: (args: MessageDialogRenderContext<TData, TReason>): TNode => {
      return options.render(args);
    },
  };
}

/**
 * The slide template's option mapping — the geometry, the clip, and `render` with the direction
 * added to its context.
 *
 * `withDirection` is the one line the two bindings genuinely disagree about, so it is the one
 * parameter: React spreads, and Solid **must** use `mergeProps`, the render args being getters that
 * a spread would freeze. Everything above it — asking the core whether the arrangement is contained
 * rather than re-deriving it, the animation, the style, `clipContainer` — is one answer.
 *
 * @internal Not exported from index.ts.
 */
export function slideDialogOptions<
  TData,
  TReason extends string,
  TStyle extends DialogStyle,
  TNode,
>(
  options: TemplateBaseOptions<
    TData,
    SlideDialogRenderContext<TData, TReason>,
    TReason,
    TStyle,
    TNode
  > &
    SlideTemplateExtras,
  withDirection: (
    args: BaseRenderContext<TData, TReason>,
    extra: { readonly direction: SlideDirection }
  ) => SlideDialogRenderContext<TData, TReason>
) {
  // Asked of the core rather than re-derived: the geometry written here and the placement the
  // runtime resolves are one decision, and a host getter is a portal in both.
  const contained = isContainedArrangement(options);
  const align = options.align ?? 'stretch';

  return {
    ...buildDialogOptions(options, {
      animation: slideAnimation(options.direction, align),
      style: slideDialogStyle({ direction: options.direction, contained, align }),
      template: 'slide',
    }),
    // A slide translates past its container edge, so the wrapper is clipped to stop an off-screen
    // panel expanding document overflow.
    clipContainer: true,
    render: (args: BaseRenderContext<TData, TReason>): TNode => {
      return options.render(withDirection(args, { direction: options.direction }));
    },
  };
}
