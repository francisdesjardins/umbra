import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';

type VanillaTitleProps = {
  readonly children: ReactNode;
  /** What `ariaLabelledBy` points at. Named rather than left to a `...rest` spread, because it is
   * the one attribute the dialog's option has to match and a spread is where it goes missing. */
  readonly id?: string | undefined;
};

export function VanillaTitle({ children, id }: VanillaTitleProps) {
  return (
    <h2 id={id} className={styles['dialogTitle']}>
      {children}
    </h2>
  );
}
