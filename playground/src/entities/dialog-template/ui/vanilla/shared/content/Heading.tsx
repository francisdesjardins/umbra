import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/shared/content/styles.module.css';

type HeadingProps = {
  readonly children: ReactNode;
  /** What a form modal's `ariaLabelledBy` points at. */
  readonly id?: string | undefined;
};

export function Heading({ children, id }: HeadingProps) {
  return (
    <h3 id={id} className={styles['heading']}>
      {children}
    </h3>
  );
}
