import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/slide-dialog/styles.module.css';

type VanillaTitleProps = {
  readonly children: ReactNode;
  /** What the panel's `ariaLabelledBy` points at. */
  readonly id?: string | undefined;
};

export function VanillaTitle({ children, id }: VanillaTitleProps) {
  return (
    <h2 id={id} className={styles['slideTitle']}>
      {children}
    </h2>
  );
}
