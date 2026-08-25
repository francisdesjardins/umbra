import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/slide-dialog/styles.module.css';
import { useScrollRegion } from '@/entities/dialog-template/ui/shared/scroll-region';

type VanillaContentProps = {
  readonly children: ReactNode;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

export function VanillaContent({ children, label }: VanillaContentProps) {
  const { ref, regionProps } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');

  return (
    <div className={styles['slideContent']} ref={ref} {...regionProps}>
      {children}
    </div>
  );
}
