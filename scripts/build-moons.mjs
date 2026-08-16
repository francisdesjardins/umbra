import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The README's moon marks, drawn from the favicon rather than borrowed from a vendor's emoji set.
 *
 * Three things forced files instead of the inline `<svg>` the playground's `MoonPhase` uses:
 * GitHub sanitises inline SVG out of markdown, an `<img>` is an isolated document so
 * `currentColor` never reaches it, and the same mark has to sit on GitHub's light theme and its
 * dark one.
 *
 * That last one is what decides the palette. The favicon is an amber corona around a `#0f172a`
 * umbra, and a near-black disc vanishes on a dark background — so the umbra here is *transparent*
 * and takes the page's own colour, which is what a shadow does anyway. Only the lit limb and the
 * corona are painted, in the favicon's amber, and the mark reads on either theme without a
 * `prefers-color-scheme` swap or a `<picture>` for every heading.
 *
 * The geometry is `MoonPhase.tsx`'s, extended with the two gibbous and two crescent phases the
 * footer's falloff needs: one circle of radius R, and a terminator that is an ellipse whose
 * semi-minor axis is how far from a quarter the phase is. `rx: 0` is a straight terminator, which
 * is exactly a quarter moon.
 */

const AMBER = '#f59e0b';
const SIZE = 16;
const C = SIZE / 2;
const R = 6.5;
const STROKE = 1.5;
/**
 * The full moon is a disc where every other phase is a *stroked* ring, and a stroke straddles its
 * path — so the ring's outer edge is half a stroke beyond `R` and a disc drawn at `R` comes out
 * visibly smaller than its companions. Measured at 64px: 52 across against everyone else's 58.
 * What has to match is the outer edge, not the radius they are nominally drawn at.
 */
const FULL_R = R + STROKE / 2;
/** A quarter of the way between a quarter moon and full — the crescent/gibbous waist. */
const WAIST = R / 2;

/**
 * The lit limb.
 *
 * `lightFromRight` picks which limb the sun is on: waxing phases light the right, waning the
 * left. `bulge` is whether the terminator swells away from the lit side (gibbous, more than half
 * lit) or back into it (crescent, less than half).
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
  // Swelling away from the lit limb continues the same rotational direction; curving back into it
  // reverses, which is the whole difference between a gibbous and a crescent.
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
