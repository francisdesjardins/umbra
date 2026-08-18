/**
 * Shown while a route's chunk arrives — self-contained on purpose: a spinner that had to fetch a
 * component library would arrive with the page it covers for. SMIL carries the rotation, so it
 * ships no stylesheet either.
 */
export const RoutePending = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--app-space-8)' }}>
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 32, height: 32, flexShrink: 0 }}>
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--app-flame)"
          strokeWidth="3"
          strokeDasharray="42 18"
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </svg>
    </div>
  );
};
