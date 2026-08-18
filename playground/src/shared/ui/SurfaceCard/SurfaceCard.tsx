import styles from '@/shared/ui/SurfaceCard/SurfaceCard.module.css';
import type { ReactNode } from 'react';

type SurfaceCardProps = {
  /** Adds the hover lift. Use for cards that reveal code or navigate somewhere. */
  readonly interactive?: boolean | undefined;
  readonly children: ReactNode;
};

/**
 * The playground's one card surface — example cards, story cards and template rows are the same
 * object at three sizes, and each re-declaring the border, dark-mode background and hover lift is
 * how they diverged. No `sx` passthrough: that escape hatch is what let them drift.
 */
export const SurfaceCard = ({ interactive, children }: SurfaceCardProps) => {
  const className =
    interactive === true ? `${styles['card']} ${styles['interactive']}` : styles['card'];
  // The stable hook the smoke probe locates cards by — a hashed module class cannot be one.
  return (
    <div data-surface-card className={className}>
      {children}
    </div>
  );
};
