/**
 * The style vocabulary the library speaks, and the one way it writes styles to an element.
 *
 * A dialog manager has to name CSS somewhere — it computes a placement, an entrance and an exit.
 * Naming it with a *renderer's* type would put that renderer in the root's public `.d.ts`, and
 * the root's promise is that it resolves with no renderer installed at all. So the type is
 * derived from the DOM, which every binding already has.
 */

/**
 * Every camelCase CSS property name, taken from `CSSStyleDeclaration` rather than restated.
 *
 * The filter is what makes it a *property* list: `CSSStyleDeclaration` also carries methods
 * (`getPropertyValue`), a numeric index, `length` and `parentRule`, and none of those are things
 * you set on a style object. Keeping only the `string`-valued keys leaves exactly the CSS
 * properties the installed DOM lib knows about — so the list grows with the platform instead of
 * with an edit here.
 */
type CssPropertyName = {
  [K in keyof CSSStyleDeclaration]-?: K extends string
    ? CSSStyleDeclaration[K] extends string
      ? K
      : never
    : never;
}[keyof CSSStyleDeclaration];

/**
 * A CSS style object, in the shape every binding's own style type already fits.
 *
 * This is the library's style vocabulary: `dialogPlacement` returns it, `getDialogAnimationStyles`
 * merges into it, and the option types are generic over it so a binding can substitute its own —
 * React's `CSSProperties` and Solid's are both assignable here, which is what lets each binding
 * keep the type its users expect while the core stays free of both.
 *
 * Values are `string | number` and are written verbatim: a bare number is *not* given a `px`
 * suffix. React's `style` prop does add one, so a React modal styled through the `style` option
 * keeps that behaviour (the value never passes through {@link applyStyle}); everywhere else,
 * write the unit.
 */
export type DialogStyle = {
  readonly [K in CssPropertyName]?: string | number | undefined;
};

/**
 * `marginInlineStart` → `margin-inline-start`, `webkitMaskImage` → `-webkit-mask-image`, and a
 * custom property through untouched.
 *
 * `setProperty` is the only cast-free way to write a computed key onto a `CSSStyleDeclaration`,
 * and it speaks the hyphenated form.
 *
 * **The `--` branch is unreachable from TypeScript, deliberately kept, and worth explaining once.**
 * `DialogStyle` is a mapped type over `CSSStyleDeclaration`'s own keys, so a custom property is not
 * one of them; adding a `` `--${string}` `` index would make React's `CSSProperties` — which has no
 * such index — stop satisfying `DialogStyle`, and that assignability is what lets
 * `getDialogAnimationStyles` take a binding's own style type. The branch stays for the callers the
 * type does not reach: `umbra/vanilla` is used from plain JavaScript, and `--dialog-backdrop` is
 * the one lever the library documents. It is why this function is not fully covered.
 */
const toCssName = (key: string): string => {
  if (key.startsWith('--')) {
    return key;
  }
  const hyphenated = key.replace(/[A-Z]/g, (char) => {
    return `-${char.toLowerCase()}`;
  });
  // A vendor prefix is a *leading* dash the camelCase form cannot carry: `webkitMaskImage`
  // hyphenates to `webkit-mask-image`, which is not a property. The four prefixes are the ones
  // `CSSStyleDeclaration` itself exposes.
  return /^(webkit|moz|ms|o)-/.test(hyphenated) ? `-${hyphenated}` : hyphenated;
};

/**
 * The part of an element this writes through.
 *
 * Two methods, which is all it ever calls — narrowed for the reason `BackdropDialog` and
 * `ClosableDialog` are: a real `HTMLElement` satisfies it unchanged, and the clearing logic below
 * becomes assertable in Node, where the interesting half lives. Asking for the whole element was
 * the only thing making this a browser question.
 */
export type StyleTarget = {
  readonly style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'>;
};

/**
 * Write a style object onto an element, clearing whatever the previous one set and this one does
 * not.
 *
 * The clearing half is the reason this exists rather than an `Object.assign`: a style object is
 * recomputed per phase, and a property that appears only in the entrance keyframe would otherwise
 * survive into the exit. A binding that renders through a virtual DOM gets this from its
 * renderer; one that owns the element writes it here.
 *
 * @param element - The element to style — the `<dialog>` or the host it is placed against.
 * @param next - The style to apply.
 * @param previous - What was applied last time, so its leftovers can be removed. Omit on first
 *   application.
 * @returns `next`, so a caller can keep it as the next call's `previous` in one expression.
 *
 * @example
 * const exitStyle = applyStyle(dialog, { opacity: 0, transform: 'scale(0.95)' });
 * applyStyle(dialog, { opacity: 1 }, exitStyle); // `transform` is removed
 */
export function applyStyle(
  element: StyleTarget,
  next: DialogStyle,
  previous?: DialogStyle
): DialogStyle {
  if (previous) {
    for (const key of Object.keys(previous)) {
      if (!(key in next)) {
        element.style.removeProperty(toCssName(key));
      }
    }
  }

  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) {
      element.style.removeProperty(toCssName(key));
      continue;
    }
    element.style.setProperty(toCssName(key), String(value));
  }

  return next;
}
