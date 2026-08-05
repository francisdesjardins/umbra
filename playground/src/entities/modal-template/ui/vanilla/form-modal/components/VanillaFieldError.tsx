import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type VanillaFieldErrorProps = {
  readonly children: ReactNode;
};

export function VanillaFieldError({ children }: VanillaFieldErrorProps) {
  return <div className={styles['fieldError']}>{children}</div>;
}
