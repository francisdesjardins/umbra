import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-dialog/styles.module.css';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';

type VanillaContainerProps = {
  readonly children: ReactNode;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

export function VanillaContainer({ children, label }: VanillaContainerProps) {
  const { ref, regionProps } = useScrollRegion<HTMLDivElement>(label ?? 'Scrollable content');

  return (
    <div className={styles['modalContainer']} ref={ref} {...regionProps}>
      {children}
    </div>
  );
}
