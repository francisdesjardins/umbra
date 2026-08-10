/**
 * WCAG contrast, and the one operation worth having beside it: nudge a colour until it passes.
 *
 * Written out rather than pulled in because the playground is a demo of a zero-dependency
 * library and a colour package in its manifest would be the first thing a reader notices.
 */

type Rgb = { readonly r: number; readonly g: number; readonly b: number };
type Hsl = { readonly h: number; readonly s: number; readonly l: number };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const HSL = /^hsla?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i;

const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = lig - c / 2;
  // Rounded, because the browser rounds: measuring the float landed a token at 4.49:1 on the
  // page after `readableHsl` had certified it at 4.5. Measure what will actually be painted.
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
};

/** `null` for anything this does not understand, so a caller can leave such a value alone. */
export const parseCssColor = (input: string): Rgb | null => {
  const value = input.trim();

  const hex = HEX.exec(value);
  if (hex?.[1]) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((c) => {
              return c + c;
            })
            .join('')
        : hex[1];
    const n = Number.parseInt(digits, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  const hsl = HSL.exec(value);
  if (hsl?.[1] && hsl[2] !== undefined && hsl[3] !== undefined) {
    return hslToRgb({ h: Number(hsl[1]), s: Number(hsl[2]), l: Number(hsl[3]) });
  }

  const rgb = RGB.exec(value);
  if (rgb?.[1] && rgb[2] !== undefined && rgb[3] !== undefined) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }

  return null;
};

const luminance = ({ r, g, b }: Rgb): number => {
  const channel = (v: number) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** The WCAG 2.x ratio, 1–21. Both colours must be opaque; composite alpha before calling. */
export const contrastRatio = (foreground: Rgb, background: Rgb): number => {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/**
 * Walk an `hsl()` colour's lightness toward the readable end until it clears `minimum`.
 *
 * Lightness only — hue and saturation are what make a syntax theme recognisable as itself, and
 * a palette repainted to pass an audit is a different palette. Returns the input unchanged when
 * it already passes, when it is not an `hsl()`, or when even the endpoint cannot reach the bar,
 * because a silent black-or-white substitution would be worse than a reported failure.
 */
export const readableHsl = (color: string, background: string, minimum = 4.5): string => {
  const parsed = HSL.exec(color.trim());
  const back = parseCssColor(background);
  if (!parsed?.[1] || parsed[2] === undefined || parsed[3] === undefined || !back) {
    return color;
  }

  const h = Number(parsed[1]);
  const s = Number(parsed[2]);
  const start = Number(parsed[3]);
  // Toward black on a light background, toward white on a dark one.
  const step = luminance(back) > 0.18 ? -1 : 1;

  for (let l = start; l >= 0 && l <= 100; l += step) {
    if (contrastRatio(hslToRgb({ h, s, l }), back) >= minimum) {
      return `hsl(${h.toString()}, ${s.toString()}%, ${l.toString()}%)`;
    }
  }
  return color;
};
