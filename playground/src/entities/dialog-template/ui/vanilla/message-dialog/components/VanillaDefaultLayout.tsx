import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';

type VanillaDefaultLayoutProps = {
  readonly children: ReactNode;
};

export function VanillaDefaultLayout({ children }: VanillaDefaultLayoutProps) {
  return <div className={styles['dialogLayout']}>{children}</div>;
}
