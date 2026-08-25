import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-dialog/styles.module.css';

type VanillaFieldGroupProps = {
  readonly children: ReactNode;
};

export function VanillaFieldGroup({ children }: VanillaFieldGroupProps) {
  return <div className={styles['fieldGroup']}>{children}</div>;
}
