export type Phase = 'full' | 'first-quarter' | 'last-quarter';

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
 */
export const MoonPhase = ({
  phase = 'first-quarter',
  size = 18,
}: {
  readonly phase?: Phase | undefined;
  readonly size?: number | undefined;
}) => {
  // Sweep flag 0 sweeps the left limb, 1 the right — the whole difference between the two
  // quarters, so the arc is written once.
  const sweep = phase === 'last-quarter' ? 1 : 0;

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
        <circle cx="8" cy="8" r="6.5" fill="currentColor" />
      ) : (
        <>
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d={`M8 1.5 A6.5 6.5 0 0 ${sweep.toString()} 8 14.5 Z`} fill="currentColor" />
        </>
      )}
    </svg>
  );
};
