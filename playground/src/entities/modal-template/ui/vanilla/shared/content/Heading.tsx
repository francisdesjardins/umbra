import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type HeadingProps = {
  readonly children: ReactNode;
};

export function Heading({ children }: HeadingProps) {
  return <h3 className={styles['heading']}>{children}</h3>;
}
