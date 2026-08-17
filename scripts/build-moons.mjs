import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The README's moon marks, drawn from the favicon. Files rather than inline `<svg>`: GitHub
 * sanitises that out of markdown, and an `<img>` is an isolated document `currentColor` never
 * reaches — so the umbra is *transparent* (the favicon's `#0f172a` would vanish on the dark theme)
 * and only the lit limb and corona are painted, in amber. Geometry is `MoonPhase.tsx`'s plus the
 * gibbous and crescent phases the footer's falloff needs: a circle of radius R and a terminator
 * ellipse whose semi-minor axis is the distance from a quarter, so `rx: 0` is a quarter moon.
 */

const AMBER = '#f59e0b';
const SIZE = 16;
const C = SIZE / 2;
const R = 6.5;
const STROKE = 1.5;
/** A stroke straddles its path: a disc at `R` reads smaller than the rings — 52 vs 58 at 64px. */
const FULL_R = R + STROKE / 2;
/** A quarter of the way between a quarter moon and full — the crescent/gibbous waist. */
const WAIST = R / 2;

/**
 * The lit limb: `lightFromRight` picks the sun's side (waxing lights the right, waning the left),
 * `bulge` whether the terminator swells away from it (gibbous) or back into it (crescent).
 */
const litPath = (rx, lit) => {
  const { lightFromRight, bulge } = lit;
  const limbSweep = lightFromRight ? 1 : 0;
  const top = `${String(C)} ${String(C - R)}`;
  const bottom = `${String(C)} ${String(C + R)}`;
  const limb = `M${top} A${String(R)} ${String(R)} 0 0 ${String(limbSweep)} ${bottom}`;

  // A quarter moon's terminator is a straight line, which `Z` already draws.
  if (rx === 0) {
    return `${limb} Z`;
  }
  // Swelling away from the lit limb keeps the rotational direction; curving back into it reverses.
  const termSweep = bulge ? limbSweep : 1 - limbSweep;
  return `${limb} A${String(rx)} ${String(R)} 0 0 ${String(termSweep)} ${top} Z`;
};

/** `null` is the full moon — no terminator at all, so it is a disc rather than a limb. */
const PHASES = [
  { name: 'waxing-crescent', right: true, rx: WAIST, bulge: false },
  { name: 'first-quarter', right: true, rx: 0, bulge: false },
  { name: 'waxing-gibbous', right: true, rx: WAIST, bulge: true },
  { name: 'full', right: true, rx: null, bulge: false },
  { name: 'waning-gibbous', right: false, rx: WAIST, bulge: true },
  { name: 'last-quarter', right: false, rx: 0, bulge: false },
  { name: 'waning-crescent', right: false, rx: WAIST, bulge: false },
];

const svg = (phase) => {
  const body =
    phase.rx === null
      ? `  <circle cx="${String(C)}" cy="${String(C)}" r="${String(FULL_R)}" fill="${AMBER}" />`
      : [
          `  <circle cx="${String(C)}" cy="${String(C)}" r="${String(R)}" fill="none" stroke="${AMBER}" stroke-width="${String(STROKE)}" />`,
          `  <path d="${litPath(phase.rx, { lightFromRight: phase.right, bulge: phase.bulge })}" fill="${AMBER}" />`,
        ].join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(SIZE)} ${String(SIZE)}" role="img" aria-label="${phase.name.replaceAll('-', ' ')} moon">
${body}
</svg>
`;
};

const outDir = resolve(import.meta.dirname, '../docs/brand');
mkdirSync(outDir, { recursive: true });
for (const phase of PHASES) {
  writeFileSync(resolve(outDir, `moon-${phase.name}.svg`), svg(phase), 'utf8');
  console.log(`docs/brand/moon-${phase.name}.svg`);
}
