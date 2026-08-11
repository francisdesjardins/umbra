export type Phase =
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

/**
 * The little moon that marks a heading — drawn, not typed.
 *
 * These were the characters `●`, `◐` and `◑`. Two problems, and the second is the one that shows:
 *
 * - A glyph is sized by the font, so the same mark inherited 48px in the page title and 12px in
 *   an `overline` label, and the geometric shapes block is drawn to different optical weights in
 *   different families anyway — the disc and the half-disc were never the same size on screen
 *   even at one font size.
 * - A screen reader reads them. `◐ Umbra` is announced “circle with left half black Umbra”, and
 *   the row of shade blocks at the foot of the landing page is worse.
 *
 * So: one shape, an explicit `size` in px, `currentColor`, and `aria-hidden`. Deliberately not
 * `em` — relative sizing is exactly the behaviour being replaced.
 *
 * **The geometry is shared with `scripts/build-moons.mjs`, which draws the README's marks.**
 * Markdown cannot call a component and GitHub strips inline `<svg>`, so that side has to emit
 * files in the favicon's amber — but the arcs are these arcs, and a change here belongs there
 * too. Keeping them in step is what stops the page and its README from disagreeing about what a
 * gibbous moon looks like.
 */

const C = 8;
const R = 6.5;
const STROKE = 1.5;
/**
 * A stroke straddles its path, so the ring's outer edge sits half a stroke beyond `R`. The full
 * moon is a *fill* rather than a ring, so drawn at `R` it comes out smaller than every phase
 * beside it — measured 52px against 58 at the same nominal size.
 */
const FULL_R = R + STROKE / 2;
/** How far the terminator swells from a straight line — the crescent/gibbous waist. */
const WAIST = R / 2;

/** Lit on the right while waxing, on the left while waning. */
const LIT_RIGHT: ReadonlySet<Phase> = new Set<Phase>([
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
]);
/** More than half lit: the terminator swells away from the lit limb instead of biting into it. */
const GIBBOUS: ReadonlySet<Phase> = new Set<Phase>(['waxing-gibbous', 'waning-gibbous']);
/** A quarter's terminator is straight, which `Z` already draws. */
const QUARTER: ReadonlySet<Phase> = new Set<Phase>(['first-quarter', 'last-quarter']);

const litPath = (phase: Phase): string => {
  const limbSweep = LIT_RIGHT.has(phase) ? 1 : 0;
  const top = `${String(C)} ${String(C - R)}`;
  const limb = `M${top} A${String(R)} ${String(R)} 0 0 ${String(limbSweep)} ${String(C)} ${String(C + R)}`;

  if (QUARTER.has(phase)) {
    return `${limb} Z`;
  }
  const termSweep = GIBBOUS.has(phase) ? limbSweep : 1 - limbSweep;
  return `${limb} A${String(WAIST)} ${String(R)} 0 0 ${String(termSweep)} ${top} Z`;
};

export const MoonPhase = ({
  phase = 'first-quarter',
  size = 18,
}: {
  readonly phase?: Phase | undefined;
  readonly size?: number | undefined;
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'inline-block', verticalAlign: '-0.125em', flexShrink: 0 }}
    >
      {phase === 'full' ? (
        <circle cx={C} cy={C} r={FULL_R} fill="currentColor" />
      ) : (
        <>
          <circle cx={C} cy={C} r={R} fill="none" stroke="currentColor" strokeWidth={STROKE} />
          <path d={litPath(phase)} fill="currentColor" />
        </>
      )}
    </svg>
  );
};
