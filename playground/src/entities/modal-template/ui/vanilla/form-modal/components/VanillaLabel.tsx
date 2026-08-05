import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type VanillaLabelProps = {
  readonly htmlFor?: string | undefined;
  readonly required?: boolean | undefined;
  readonly children: ReactNode;
};

export function VanillaLabel({ htmlFor, required, children }: VanillaLabelProps) {
  return (
    <label htmlFor={htmlFor} className={styles['label']}>
      {children}
      {required && (
        <span aria-hidden="true" className={styles['requiredMark']}>
          {' '}
          *
        </span>
      )}
    </label>
  );
}
