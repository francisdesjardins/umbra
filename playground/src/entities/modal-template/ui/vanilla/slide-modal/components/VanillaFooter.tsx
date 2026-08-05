import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css';

type VanillaFooterProps = {
  readonly children: ReactNode;
};

export function VanillaFooter({ children }: VanillaFooterProps) {
  return <div className={styles['slideFooter']}>{children}</div>;
}
