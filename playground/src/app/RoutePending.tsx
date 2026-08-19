import { Spinner } from '@/shared/ui/Spinner';

/**
 * Shown while a route's chunk arrives. `role="status"` carries the announcement, which is why the
 * arc itself is `aria-hidden`.
 */
export const RoutePending = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: 'var(--app-space-8)',
        color: 'var(--app-flame)',
      }}
      role="status"
      aria-label="Loading"
    >
      <Spinner size={32} />
    </div>
  );
};
