import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css';

type VanillaContentProps = {
  readonly children: ReactNode;
};

export function VanillaContent({ children }: VanillaContentProps) {
  return <div className={styles['slideContent']}>{children}</div>;
}
