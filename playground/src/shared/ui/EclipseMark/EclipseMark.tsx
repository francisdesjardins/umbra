/**
 * The flat mark: the eclipse reduced to what survives a favicon — a dark body and the corona
 * escaping around it, and nothing else.
 *
 * There are two marks and they have different jobs. `UmbraMoon` is the mascot: eight flame
 * clusters, an engraved face, three flicker rhythms, and it needs ~96px to read. This is the one
 * that goes in the top bar, the browser tab and anywhere else the mark is small — the same
 * geometry `public/favicon.svg` draws, lifted into a component so the bar and the tab cannot
 * drift apart.
 *
 * Deliberately not on `currentColor`: the corona is amber in both schemes and the body is dark in
 * both, because an eclipse whose disc goes white in light mode is a sun.
 */
export function EclipseMark({ size = 26 }: { readonly size?: number | undefined }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="100" cy="100" r="88" fill="var(--app-flame)" />
      {/* `--app-body-edge`, not `--app-body`: in dark mode the deep body is the page ground exactly,
          and a disc the colour of what is behind it turns the mark into a ring. The edge tone is
          the same slate one step up, which keeps a disc reading as a disc. */}
      <circle cx="100" cy="100" r="66" fill="var(--app-body-edge)" />
      {/* The limb: the trailing half darkened, so the body reads as a sphere rather than a hole. */}
      <path d="M100 34a66 66 0 0 1 0 132a66 66 0 0 0 0-132z" fill="var(--app-body)" opacity="0.9" />
    </svg>
  );
}
