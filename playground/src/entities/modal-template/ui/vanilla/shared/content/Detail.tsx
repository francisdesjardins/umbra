import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type DetailProps = {
  readonly children: ReactNode;
};

export function Detail({ children }: DetailProps) {
  return <p className={styles['detail']}>{children}</p>;
}
