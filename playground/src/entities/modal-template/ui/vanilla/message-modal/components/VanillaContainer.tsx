import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaContainerProps = {
  readonly children: ReactNode;
};

export function VanillaContainer({ children }: VanillaContainerProps) {
  return <div className={styles['modalContainer']}>{children}</div>;
}
