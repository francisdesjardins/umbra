import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';

type VanillaHeaderProps = {
  readonly children: ReactNode;
};

export function VanillaHeader({ children }: VanillaHeaderProps) {
  return <div className={styles['dialogHeader']}>{children}</div>;
}
