import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/form-dialog/styles.module.css';
import { useScrollRegion } from '@/entities/dialog-template/ui/shared/scroll-region';

type ContentProps = {
  readonly children: ReactNode;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

export function VanillaContent({ children, label }: ContentProps) {
  const { ref, regionProps } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');

  return (
    <div className={styles['formContent']} ref={ref} {...regionProps}>
      {children}
    </div>
  );
}
