/**
 * Umbra's mascot: an eclipsed sun with a face.
 *
 * The register is the heraldic/woodcut sun — a disc with an engraved face and flame rays — but
 * inverted, because this is an *umbra*: the disc is the dark body, the face is cut into it in
 * light, and the flames are the corona escaping around the rim. That is the eclipse the name
 * refers to, and it is the same thing `--dialog-backdrop` does to a page.
 *
 * Eight flames rather than the reference's ten, and drawn from inside the disc so only their
 * tips clear the rim — enough fire to read as a sun at a glance, without the silhouette turning
 * into noise at 180px in the corner of a page.
 *
 * **The eight are unchanged in number and each now travels with two smaller flames**, one short
 * and one middling, set close on either side. A corona of eight identical rays reads as a cog:
 * the eye finds the repeat immediately because every element is the same and the spacing is
 * uniform. Flanking each with a different pair breaks both at once — the ring keeps its
 * eightfold structure at a glance and dissolves into fire when actually looked at.
 *
 * The tall one is widened rather than lengthened. Reach is what turns a silhouette into noise at
 * 120px; breadth is what makes it look like it is burning. The flankers are shorter than they are
 * narrow for the same reason — they must not out-reach the flame they belong to, or the cluster
 * stops having a subject.
 *
 * Drawn inline rather than imported so the playground keeps its no-binary-assets rule.
 */
/**
 * @param breathing - Let the outer halo swell and fade. For the one that sits still: the corona
 *   flickers on three short rhythms, and a single slow pulse underneath gives them a common beat
 *   so the cluster reads as one fire rather than twenty-four twitches. It is **off** on the
 *   peeking mascot on purpose — that one is already sliding, tilting and giggling, and a
 *   breathing halo on a moving object is motion on top of motion, which is where charm becomes
 *   distraction. Slower than the slowest flame (8.3s against 5.1s) and low amplitude, or it stops
 *   being a floor under the flicker and becomes another thing competing for the eye.
 */
export function UmbraMoon({
  isDark,
  breathing = false,
}: {
  readonly isDark: boolean;
  readonly breathing?: boolean | undefined;
}) {
  // The corona is light escaping past a shadow, so it stays warm in both themes; only its
  // intensity shifts, because a bright page needs less glow to register.
  //
  // It sits at the same value as the engraved face on purpose. The corona *is* the light source
  // here and the face is only where that light reaches through the body, so a corona darker than
  // the engraving inverts the drawing's own story — which it did, a full amber step down. The
  // edge stays deep: definition against the page comes from the outline, not from dimming the
  // fill, and dimming the fill was costing the flames their read at 120px.
  const flame = isDark ? '#fbbf24' : '#f59e0b';
  const flameEdge = isDark ? '#b45309' : '#92400e';
  const body = isDark ? '#0f172a' : '#1e293b';
  const bodyEdge = isDark ? '#334155' : '#475569';
  const ink = isDark ? '#fbbf24' : '#fcd34d';

  // One flame, pointing up from the rim. Eight rotated copies make the corona — a single path
  // kept in one place so the silhouette can be tuned without touching eight of them.
  const ray = 'M87 68 C79 48, 94 36, 95 2 C104 26, 100 40, 106 34 C115 46, 117 54, 113 68 Z';

  /**
   * One cluster: the original flame, and the two that flank it. `at` is degrees either side of
   * the base angle, `sx` is across the flame and `sy` along it.
   *
   * Scaling about the disc centre rather than the flame's own base keeps every base buried inside
   * the body at any size, so a short flame never lifts its root above the rim and shows the join.
   * The ±15° spread is what keeps three flames legible as three: closer and they merge into one
   * fat ray, wider and the cluster stops reading as a group and becomes twenty-four separate rays.
   */
  const CLUSTER = [
    { at: -15, cls: 'um-flame-s', sx: 0.62, sy: 0.56 },
    { at: 0, cls: 'um-flame-l', sx: 1.14, sy: 1.0 },
    { at: 15, cls: 'um-flame-m', sx: 0.84, sy: 0.76 },
  ] as const;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 200 200"
      role="img"
      aria-label="An eclipsed sun with a face, peeking"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="um-disc" cx="38%" cy="32%" r="76%">
          <stop offset="0%" stopColor={bodyEdge} />
          <stop offset="100%" stopColor={body} />
        </radialGradient>
        <radialGradient id="um-glow" cx="50%" cy="50%" r="50%">
          <stop offset="44%" stopColor={flame} stopOpacity="0" />
          <stop offset="76%" stopColor={flame} stopOpacity="0.34" />
          <stop offset="100%" stopColor={flame} stopOpacity="0" />
        </radialGradient>
        <style>{`
          /* One curve per size, and they are shaped differently rather than merely retimed.
             A small flame guttering is quick and nearly all opacity; a large one swells slowly
             and barely changes value. Sharing a keyframe and varying only the duration is what
             makes a corona pulse as one object, which is the thing to avoid. */
          @keyframes um-gutter {
            0%, 100% { opacity: 0.82; transform: scale(1); }
            35%      { opacity: 1;    transform: scale(1.06); }
            62%      { opacity: 0.9;  transform: scale(1.01); }
          }
          @keyframes um-swell {
            0%, 100% { opacity: 0.95; transform: scale(0.995); }
            50%      { opacity: 1;    transform: scale(1.045); }
          }
          @keyframes um-lick {
            0%, 100% { opacity: 0.9;  transform: scale(1); }
            28%      { opacity: 1;    transform: scale(1.03); }
            70%      { opacity: 0.94; transform: scale(1.015); }
          }
          /* Slower than every flame above, so it reads as the fire's floor rather than a fourth
             flicker. Scale and opacity move together — a halo that changes size without changing
             value looks like the drawing is zooming, not like light. */
          @keyframes um-breathe {
            0%, 100% { opacity: 0.76; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.07); }
          }
          .um-halo { transform-origin: 100px 100px;
                     animation: um-breathe 8.3s ease-in-out infinite; }
          @keyframes um-blink {
            0%, 93%, 100% { transform: scaleY(1); }
            96%           { transform: scaleY(0.1); }
          }
          /* Durations are mutually prime-ish seconds so the three never come back into phase and
             hand the ring a visible period. */
          .um-flame-s, .um-flame-l, .um-flame-m { transform-origin: 100px 100px; }
          .um-flame-s { animation: um-gutter 2.3s ease-in-out infinite; }
          .um-flame-l { animation: um-swell  5.1s ease-in-out infinite; }
          .um-flame-m { animation: um-lick   3.4s ease-in-out infinite; }
          .um-eyes   { transform-origin: center; transform-box: fill-box;
                       animation: um-blink 6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .um-flame-s, .um-flame-l, .um-flame-m, .um-eyes, .um-halo { animation: none; }
          }
        `}</style>
      </defs>

      <circle
        cx="100"
        cy="100"
        r="112"
        fill="url(#um-glow)"
        {...(breathing ? { className: 'um-halo' } : {})}
      />

      {/* Corona — eight flames, drawn behind the body so only their tips clear the rim. Each
          gets its own wrapper because the flicker is a CSS `transform` and the placement is an
          SVG `transform` attribute: on one element the first silently wins and the ring
          collapses to a single flame at 0°. */}
      <g fill={flame} stroke={flameEdge} strokeWidth="2.5" strokeLinejoin="round">
        {[0, 45, 90, 135, 180, 225, 270, 315].flatMap((deg, i) => {
          return CLUSTER.map((flame, j) => {
            // A negative delay starts each one already mid-flicker, so the corona is alight on
            // the first frame instead of igniting together. The step is irrational-ish against
            // all three durations, which is what stops the ring re-synchronising later.
            const delay = -(((i * 3 + j) * 0.41) % 5.1);
            return (
              <g
                key={`${deg.toString()}-${flame.cls}`}
                className={flame.cls}
                style={{ animationDelay: `${delay.toFixed(2)}s` }}
              >
                <path
                  d={ray}
                  transform={`rotate(${(deg + flame.at).toString()} 100 100) translate(100 100) scale(${flame.sx.toString()} ${flame.sy.toString()}) translate(-100 -100)`}
                />
              </g>
            );
          });
        })}
      </g>

      {/* The umbra: the body doing the eclipsing. */}
      <circle cx="100" cy="100" r="64" fill="url(#um-disc)" stroke={flameEdge} strokeWidth="3" />

      {/*
        The face, engraved in light. Strokes only — a woodcut has no fills.

        Not the jolly heraldic sun it borrows its form from. This one is smug: heavy angled
        brows, eyes narrowed to a lid and a pupil, and a smirk pulled up on one side only.
        A dialog manager spends its life putting a shadow over your page and waiting for you to
        deal with it, and the mascot should look like it knows that.
      */}
      <g fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Brows: thick, angled, tapering inward — with a clear gap over the nose. Let them meet
            and the face gains a unibrow and loses the smugness. The attitude lives here. */}
        <path d="M64 82 C72 68, 85 66, 93 75" strokeWidth="6.5" />
        <path d="M107 75 C115 66, 128 68, 136 82" strokeWidth="6.5" />

        {/* Eyes: narrowed to a lid over a pupil — looking at you, thoroughly unimpressed. */}
        <g className="um-eyes">
          <path d="M70 92 C78 84, 92 84, 99 92 C92 99, 78 99, 70 92 Z" strokeWidth="3" />
          <path d="M101 92 C108 84, 122 84, 130 92 C122 99, 108 99, 101 92 Z" strokeWidth="3" />
          {/* The straight upper lid is what narrows the eye without shrinking it. */}
          <path d="M70 91 C78 86, 92 86, 99 91" strokeWidth="4.5" />
          <path d="M101 91 C108 86, 122 86, 130 91" strokeWidth="4.5" />
          <circle cx="85" cy="92" r="4" fill={ink} stroke="none" />
          <circle cx="115" cy="92" r="4" fill={ink} stroke="none" />
        </g>

        {/* Nose: one ridge, one turn. Kept quiet so the brows and the smirk carry the face. */}
        <path d="M100 100 L97 120 C97 124, 103 124, 104 120" strokeWidth="3" />

        {/* The smirk. Flat on the left, lifting on the right — asymmetry is the entire joke;
            a symmetric curve is a smile, and a smile would be a different library. */}
        <path d="M83 134 C94 134, 107 133, 116 126" strokeWidth="4" />
        <path d="M118 122 C120 126, 120 130, 118 133" strokeWidth="3" />
      </g>
    </svg>
  );
}
