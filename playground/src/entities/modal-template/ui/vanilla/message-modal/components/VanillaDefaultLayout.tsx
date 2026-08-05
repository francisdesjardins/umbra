import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaDefaultLayoutProps = {
  readonly children: ReactNode;
};

export function VanillaDefaultLayout({ children }: VanillaDefaultLayoutProps) {
  return <div className={styles['modalLayout']}>{children}</div>;
}
