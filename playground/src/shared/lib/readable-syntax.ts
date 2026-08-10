import { readableHsl } from '@/shared/lib/color-contrast';
import type { CSSProperties } from 'react';

type PrismStyle = Record<string, CSSProperties>;

/**
 * Raise every token colour in a Prism theme to 4.5:1 against the surface it is actually painted on.
 *
 * `oneLight` and `oneDark` are tuned for their own backgrounds (`#fafafa`, `#282c34`); this app
 * paints code on the page's own surface instead, so a theme's quietest tokens — comments first —
 * land under the bar. Measured on the live page, `oneLight` shipped six failing token colours,
 * the worst at 2.58:1, and code samples are most of what this site is.
 *
 * Lightness is the only thing moved, so each theme still reads as itself: the comment stays the
 * grey it was, dark enough to be a comment you can read.
 */
export const readableSyntaxStyle = (style: PrismStyle, background: string): PrismStyle => {
  const out: PrismStyle = {};
  for (const [selector, rules] of Object.entries(style)) {
    const { color } = rules;
    out[selector] =
      color === undefined ? rules : { ...rules, color: readableHsl(color, background) };
  }
  return out;
};
