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
 * Drawn inline rather than imported so the playground keeps its no-binary-assets rule.
 */
export function UmbraMoon({ isDark }: { readonly isDark: boolean }) {
  // The corona is light escaping past a shadow, so it stays warm in both themes; only its
  // intensity shifts, because a bright page needs less glow to register.
  const flame = isDark ? '#f59e0b' : '#d97706';
  const flameEdge = isDark ? '#b45309' : '#92400e';
  const body = isDark ? '#0f172a' : '#1e293b';
  const bodyEdge = isDark ? '#334155' : '#475569';
  const ink = isDark ? '#fbbf24' : '#fcd34d';

  // One flame, pointing up from the rim. Eight rotated copies make the corona — a single path
  // kept in one place so the silhouette can be tuned without touching eight of them.
  const ray = 'M87 68 C79 48, 94 36, 95 2 C104 26, 100 40, 106 34 C115 46, 117 54, 113 68 Z';

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
          @keyframes um-flicker {
            0%, 100% { opacity: 0.92; transform: scale(1); }
            50%      { opacity: 1;    transform: scale(1.035); }
          }
          @keyframes um-blink {
            0%, 93%, 100% { transform: scaleY(1); }
            96%           { transform: scaleY(0.1); }
          }
          .um-corona { transform-origin: 100px 100px;
                       animation: um-flicker 3.6s ease-in-out infinite; }
          .um-eyes   { transform-origin: center; transform-box: fill-box;
                       animation: um-blink 6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .um-corona, .um-eyes { animation: none; }
          }
        `}</style>
      </defs>

      <circle cx="100" cy="100" r="112" fill="url(#um-glow)" />

      {/* Corona — eight flames, drawn behind the body so only their tips clear the rim. */}
      <g
        className="um-corona"
        fill={flame}
        stroke={flameEdge}
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          return <path key={deg} d={ray} transform={`rotate(${deg.toString()} 100 100)`} />;
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
