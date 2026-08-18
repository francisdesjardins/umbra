import type { CSSProperties, ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';

type OverflowContainerProps = {
  readonly children: ReactNode;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
  /** `max-height` defaults to `70vh` in the CSS module; override it (or anything else) here. */
  readonly style?: CSSProperties | undefined;
};

/**
 * Height-capped scroll container for long content. While actually overflowing it carries
 * `data-overflowing`, so a copy styles the state from CSS alone (`[data-overflowing] { … }`) the
 * way the MUI flavour spends `overflowSx`.
 */
export function OverflowContainer({ children, label, style }: OverflowContainerProps) {
  const { ref, isOverflowing, regionProps } = useScrollRegion<HTMLDivElement>(
    label ?? 'Scrollable content'
  );

  return (
    <div
      className={styles['overflowContainer']}
      ref={ref}
      {...regionProps}
      {...(isOverflowing && { 'data-overflowing': true })}
      style={style}
    >
      {children}
    </div>
  );
}
