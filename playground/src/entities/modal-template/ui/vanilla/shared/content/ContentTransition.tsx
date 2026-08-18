import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type ContentTransitionProps = {
  /** Show the fallback instead of the children. */
  readonly pending: boolean;
  /** What to show while `pending` — React's word for it, and the same idea. */
  readonly fallback: ReactNode;
  readonly children: ReactNode;
  readonly duration?: number | undefined;
};

/**
 * Crossfade between a fallback and the real content via CSS opacity, both layers in one grid cell
 * so they overlap without absolute positioning — no layout collapse or overflow. `pending` not
 * `loading` (this never knows *why* content is not ready, and `isPreparing` is not about data) and
 * not `transitioning` (that names the animation, which runs when this flips, not while it is true).
 */
export function ContentTransition({
  pending,
  fallback,
  children,
  duration = 250,
}: ContentTransitionProps) {
  const transition = `opacity ${String(duration)}ms ease`;

  return (
    <div className={styles['transitionGrid']}>
      <div
        className={[styles['transitionLayer'], styles['transitionFallback']].join(' ')}
        style={{
          transition,
          opacity: pending ? 1 : 0,
          pointerEvents: pending ? 'auto' : 'none',
        }}
      >
        {fallback}
      </div>
      <div
        className={styles['transitionLayer']}
        style={{
          transition,
          opacity: pending ? 0 : 1,
          pointerEvents: pending ? 'none' : 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
