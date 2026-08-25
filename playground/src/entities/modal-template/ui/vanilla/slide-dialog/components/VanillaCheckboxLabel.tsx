import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-dialog/styles.module.css';

type VanillaCheckboxLabelProps = {
  readonly children: ReactNode;
};

export function VanillaCheckboxLabel({ children }: VanillaCheckboxLabelProps) {
  return <label className={styles['checkboxLabel']}>{children}</label>;
}
