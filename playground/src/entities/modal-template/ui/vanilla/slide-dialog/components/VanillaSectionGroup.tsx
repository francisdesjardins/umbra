import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-dialog/styles.module.css';

type VanillaSectionGroupProps = {
  readonly children: ReactNode;
};

export function VanillaSectionGroup({ children }: VanillaSectionGroupProps) {
  return <div className={styles['sectionGroup']}>{children}</div>;
}
