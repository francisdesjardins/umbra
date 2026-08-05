import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaHeaderProps = {
  readonly children: ReactNode;
};

export function VanillaHeader({ children }: VanillaHeaderProps) {
  return <div className={styles['modalHeader']}>{children}</div>;
}
