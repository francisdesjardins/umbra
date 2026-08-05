import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type HeaderProps = {
  readonly children: ReactNode;
};

export function VanillaHeader({ children }: HeaderProps) {
  return <div className={styles['formHeader']}>{children}</div>;
}
