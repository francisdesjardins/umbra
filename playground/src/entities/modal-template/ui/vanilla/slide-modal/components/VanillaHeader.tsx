import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css';

type VanillaHeaderProps = {
  readonly children: ReactNode;
};

export function VanillaHeader({ children }: VanillaHeaderProps) {
  return <div className={styles['slideHeader']}>{children}</div>;
}
