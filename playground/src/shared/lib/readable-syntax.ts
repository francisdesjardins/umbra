import { readableHsl } from '@/shared/lib/color-contrast';
import type { CSSProperties } from 'react';

type PrismStyle = Record<string, CSSProperties>;

/**
 * Raise every token colour in a Prism theme to 4.5:1 against the surface it is actually painted on.
 * `oneLight`/`oneDark` are tuned for their own backgrounds (`#fafafa`, `#282c34`), so on the page's
 * own surface the quietest tokens fall under the bar — `oneLight` shipped six failing colours, the
 * worst at 2.58:1. Lightness is the only thing moved, so each theme still reads as itself.
 */
export const readableSyntaxStyle = (style: PrismStyle, background: string): PrismStyle => {
  const out: PrismStyle = {};
  for (const [selector, rules] of Object.entries(style)) {
    const { color } = rules;
    out[selector] =
      color === undefined ? rules : { ...rules, color: readableHsl(color, { background }) };
  }
  return out;
};
