import type { CSSProperties, ReactNode } from 'react';
import type {
  CloseResult,
  ModalAnimation,
  ModalRenderArgs,
  ModalVariant,
  UseModalBaseOptions,
} from '../core/types.js';

/**
 * Options common to all template hooks (useMessageModal, useSlideModal).
 *
 * Stated as the **complement** of what a template owns rather than a list of what it forwards:
 * an option added to `UseModalBaseOptions` reaches every template by default, and only a
 * deliberate edit to the exclusion list keeps it out. An enumeration of forwarded keys would
 * instead let a new core option reach no template at all, with nothing to fail.
 *
 * The five exclusions are exactly what a template does not inherit: `id`, `render` and
 * `onClose` are redeclared by {@link TemplateBaseOptions} (`render` with the template's own
 * context type), while `modalType` and `clipContainer` are the template's to set — a template
 * names itself, and clipping follows from its animation.
 *
 * Built from the flat `UseModalBaseOptions` and intersected with `ModalVariant` directly, so
 * the union is not double-intersected the way omitting from `UseModalOptions` would.
 *
 * @internal Not exported from index.ts.
 */
export type TemplateCommonOptions<TData = void> = Omit<
  UseModalBaseOptions<TData>,
  'id' | 'render' | 'onClose' | 'modalType' | 'clipContainer'
> &
  ModalVariant;

/**
 * Base options shared by all template hooks.
 *
 * Combines `TemplateCommonOptions` with the `id`, `render`, and `onClose`
 * props that every template requires. Template-specific props (e.g.
 * `direction`, `defaultValues`) are added via intersection in each template.
 *
 * @typeParam TData - Close data payload type.
 * @typeParam TRenderContext - The template's render context type.
 *
 * @internal Not exported from index.ts.
 */
export type TemplateBaseOptions<TData, TRenderContext> = TemplateCommonOptions<TData> & {
  /** Unique modal identifier */
  readonly id: string;
  /** Render function receiving template-specific context */
  readonly render: (ctx: TRenderContext) => ReactNode;
  /** Called when the modal closes with the close result */
  readonly onClose?: ((result: CloseResult<TData>) => void | Promise<void>) | undefined;
};

/**
 * Base context shared by all template render callbacks. Template-specific contexts intersect
 * this with their extra fields (e.g. `useSlideModal` adds `direction`).
 *
 * It *is* `ModalRenderArgs`, not a copy of it: a template's render callback sees exactly what a
 * bare `useModal` render callback sees, because that is what the templates forward. Stating it
 * as an alias means a new render-time field is added once, in the core, and every template
 * context has it — and no template can drift into a subtly different `isPreparing`.
 *
 * @typeParam TData - The modal's close payload, so a template's `handle.close` is as typed as
 * the core one.
 *
 * @internal Not exported from index.ts.
 */
export type BaseRenderContext<TData = void> = ModalRenderArgs<TData>;

/**
 * Default fade animation used by useMessageModal.
 * useSlideModal uses direction-based slide animation instead.
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
 * Maps template options to `useModal` options, applying the template's defaults for animation,
 * style and modalType. Eliminates the repeated prop-by-prop passthrough in each template hook.
 *
 * A caller's `style` is merged *over* the template's structural one rather than replacing it:
 * the template's placement is what makes it that template, but sizing is the caller's — a
 * drawer that should be 380px wide says so without rebuilding the hook.
 *
 * @internal Not exported from index.ts.
 */
export function buildModalOptions<TData = void, TRenderContext = unknown>(
  options: TemplateBaseOptions<TData, TRenderContext>,
  defaults: {
    readonly animation: ModalAnimation;
    readonly style?: CSSProperties | undefined;
    readonly modalType?: UseModalBaseOptions['modalType'];
  }
) {
  return {
    ...options,
    animation: options.animation ?? defaults.animation,
    style: { ...defaults.style, ...options.style },
    modalType: defaults.modalType,
  };
}
