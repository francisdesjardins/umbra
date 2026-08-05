import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type FooterProps = {
  readonly children: ReactNode;
};

export function VanillaFooter({ children }: FooterProps) {
  return <div className={styles['formFooter']}>{children}</div>;
}
