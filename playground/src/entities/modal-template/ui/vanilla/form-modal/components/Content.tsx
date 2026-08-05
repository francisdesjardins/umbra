import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type ContentProps = {
  readonly children: ReactNode;
};

export function VanillaContent({ children }: ContentProps) {
  return <div className={styles['formContent']}>{children}</div>;
}
