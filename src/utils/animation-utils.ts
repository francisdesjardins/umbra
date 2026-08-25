import type { DialogPlacement } from '../core/placement.js';
import type { DialogStyle } from '../core/style.js';
import type { ModalAnimation, ModalPhase } from '../core/types.js';

/**
 * Extract the primary transition property from a comma-separated list.
 *
 * @param transitionProp - CSS transition-property value (e.g., "opacity, transform")
 * @returns The primary property (first in the list)
 *
 * @example
 * getPrimaryTransitionProperty('opacity, transform'); // "opacity"
 * getPrimaryTransitionProperty('transform'); // "transform"
 */
export function getPrimaryTransitionProperty(transitionProp: string): string {
  // `split` never answers an empty array, so the optional chain and fallback are
  // `noUncheckedIndexedAccess` tax rather than cases — and are why the line is not fully covered.
  return transitionProp.split(',')[0]?.trim() ?? transitionProp;
}

/**
 * What a bare `useDialog` animates with when the caller names no animation. Shared by every binding
 * on purpose: two copies would be two products the day one of them is tuned.
 */
export const DEFAULT_MODAL_ANIMATION = {
  entrance: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.95)' },
  duration: 200,
  exitDuration: 150,
  transitionProperty: 'opacity, transform',
} satisfies ModalAnimation;

/** Entrance duration (ms) applied when `ModalAnimation.duration` is omitted. */
export const DEFAULT_DURATION = 200;

/** CSS `transition-property` applied when `ModalAnimation.transitionProperty` is omitted. */
export const DEFAULT_TRANSITION_PROPERTY = 'opacity';

/** A {@link ModalAnimation} with every optional field resolved to a concrete value. */
export type ResolvedAnimation = {
  /** Entrance duration in ms. */
  readonly entranceDuration: number;
  /** Exit duration in ms — falls back to the entrance duration. */
  readonly exitDuration: number;
  /** Full `transition-property` value, possibly comma-separated. */
  readonly transitionProperty: string;
  /**
   * First property of {@link transitionProperty} — the one whose `transitionend` event drives close
   * finalization.
   */
  readonly primaryProperty: string;
};

/**
 * Resolve a {@link ModalAnimation}'s optional fields to concrete values — the single place that
 * knows the defaults, read by the style builder below and by `syncCloseSequence`, so a dialog's
 * declared transition and the exit listener waiting on it can never disagree.
 */
export function resolveAnimation(animation: ModalAnimation): ResolvedAnimation {
  const entranceDuration = animation.duration ?? DEFAULT_DURATION;
  const transitionProperty = animation.transitionProperty ?? DEFAULT_TRANSITION_PROPERTY;

  return {
    entranceDuration,
    exitDuration: animation.exitDuration ?? entranceDuration,
    transitionProperty,
    primaryProperty: getPrimaryTransitionProperty(transitionProperty),
  };
}

/** Everything the `<dialog>`'s computed style is built from, beyond the phase. */
export type DialogAnimationStyleOptions<TStyle extends DialogStyle> = {
  /** Entrance/exit CSS, durations and transition-property. */
  readonly animation: ModalAnimation<TStyle>;
  /**
   * Structural styles applied by template hooks (e.g. slide positioning). Regular users should
   * style their content inside the `render` callback instead.
   */
  readonly customStyle?: TStyle | undefined;
  /**
   * Where this dialog is positioned from, from `dialogPlacement()`. Only its `dialog` half
   * applies here; the `host` half belongs to the element the caller renders around it.
   */
  readonly placement?: DialogPlacement | undefined;
};

/** What a dialog that was never placed sits at: nowhere in particular, and nothing to clear. */
const UNPLACED: DialogPlacement = { host: null, dialog: {}, backdrop: null };

/**
 * Compute CSS properties for the `<dialog>` element, merging animation state,
 * base layout defaults, and optional template-specific positioning styles.
 *
 * @param phase - `'open'` selects the entrance properties and everything else the exit ones;
 *   `'closed'` takes the dialog out of layout entirely — see the `display` note below.
 * @param options - The animation, and the two optional style layers merged over it.
 * @returns The merged style object for the `<dialog>` element, carrying the caller's own `TStyle`
 *   through the intersection, so a binding whose style type is stricter than {@link DialogStyle} can
 *   hand the result straight to its renderer.
 *
 * @typeParam TStyle - The style object type this binding speaks, inferred from `animation`.
 */
export function getDialogAnimationStyles<TStyle extends DialogStyle>(
  phase: ModalPhase,
  options: DialogAnimationStyleOptions<TStyle>
): DialogStyle & Partial<TStyle> {
  const { animation, customStyle, placement = UNPLACED } = options;
  const isAnimating = phase === 'open';
  const { entranceDuration, exitDuration, transitionProperty } = resolveAnimation(animation);
  const activeDuration = isAnimating ? entranceDuration : exitDuration;

  // Each comma-separated property needs its own duration; omitting it gives that property a 0s
  // transition, which never fires `transitionend`.
  const transitionValue = transitionProperty
    .split(',')
    .map((p) => {
      return `${p.trim()} ${String(activeDuration)}ms ease-out`;
    })
    .join(', ');

  const base = {
    // A closed dialog is out of layout, which the UA would do on its own (`dialog:not([open])` is
    // `display: none`) except that the inline `display: flex` outranks it — leaving a closed
    // contained dialog as an invisible, full-region click blocker over what it sits in front of.
    display: phase === 'closed' ? 'none' : 'flex',
    flexDirection: 'column' as const,
    margin: 'auto',
    padding: 0,
    border: 'none',
    background: 'transparent',
    // `dialog.show()` renders in normal flow and needs explicit positioning; `showModal()`
    // does not. Which one this is, and what it anchors to, is `dialogPlacement`'s answer.
    ...placement.dialog,
  };

  // `Object.assign` rather than one object literal, and that is a type decision: spreading a generic
  // `TStyle` into a literal loses it, while `Object.assign` returns the intersection of what it
  // merged — which carries `TStyle` into the return type, so React's `style` prop takes it as-is.
  return Object.assign(
    base,
    customStyle ?? {},
    { transition: transitionValue },
    isAnimating ? animation.entrance : animation.exit
  );
}
