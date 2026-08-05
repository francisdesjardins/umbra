import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaTitleProps = {
  readonly children: ReactNode;
};

export function VanillaTitle({ children }: VanillaTitleProps) {
  return <h2 className={styles['modalTitle']}>{children}</h2>;
}
