import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/form-dialog/styles.module.css';

type VanillaFieldErrorProps = {
  readonly children: ReactNode;
  /**
   * What a field's `aria-describedby` points at — a message element with no id is one no control
   * can reference, leaving the error on screen and absent from the accessibility tree.
   */
  readonly id?: string | undefined;
};

export function VanillaFieldError({ children, id }: VanillaFieldErrorProps) {
  return (
    <div className={styles['fieldError']} id={id}>
      {children}
    </div>
  );
}
