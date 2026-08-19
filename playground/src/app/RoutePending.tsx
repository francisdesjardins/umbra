/**
 * Shown while a route's chunk arrives — self-contained on purpose: a spinner that had to fetch a
 * component library would arrive with the page it covers for.
 *
 * The rotation is on the arc, not on the `<svg>`: a transform set on the root element is not the
 * same lever, and animating it there leaves a still ring. Reduced motion keeps the arc and stops
 * the spin, which is why the dash gap is wide enough to read as a state on its own.
 */
export const RoutePending = () => {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'center', padding: 'var(--app-space-8)' }}
      role="status"
      aria-label="Loading"
    >
      <svg viewBox="0 0 24 24" aria-hidden style={{ width: 32, height: 32, flexShrink: 0 }}>
        <style>{`
          @keyframes route-pending-spin { to { transform: rotate(360deg); } }
          .route-pending-arc {
            transform-origin: 12px 12px;
            animation: route-pending-spin 0.8s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .route-pending-arc { animation: none; }
          }
        `}</style>
        <circle
          className="route-pending-arc"
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--app-flame)"
          strokeWidth="3"
          strokeDasharray="42 18"
        />
      </svg>
    </div>
  );
};
