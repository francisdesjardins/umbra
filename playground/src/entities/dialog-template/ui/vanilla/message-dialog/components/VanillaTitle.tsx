import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';

type VanillaTitleProps = {
  readonly children: ReactNode;
  /** What `ariaLabelledBy` points at — see the MUI `Title` for why it is a prop rather than a spread. */
  readonly id?: string | undefined;
};

export function VanillaTitle({ children, id }: VanillaTitleProps) {
  return (
    <h2 id={id} className={styles['dialogTitle']}>
      {children}
    </h2>
  );
}
