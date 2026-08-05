import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type VanillaButtonContainerProps = {
  readonly children: ReactNode;
};

export function VanillaButtonContainer({ children }: VanillaButtonContainerProps) {
  return <div className={styles['buttonContainer']}>{children}</div>;
}
