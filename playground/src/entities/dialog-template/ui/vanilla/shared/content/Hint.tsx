import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/shared/content/styles.module.css';

type HintProps = {
  readonly children: ReactNode;
};

export function Hint({ children }: HintProps) {
  return <p className={styles['hint']}>{children}</p>;
}
