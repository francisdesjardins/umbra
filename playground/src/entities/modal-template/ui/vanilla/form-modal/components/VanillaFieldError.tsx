import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

type VanillaFieldErrorProps = {
  readonly children: ReactNode;
  /**
   * Takes an `id` for the same reason every `Title` here does: something has to point at it.
   *
   * A field's `aria-describedby` names the element carrying its message, so a message element
   * that cannot be given an id is one no control can reference — the error is on screen and
   * absent from the accessibility tree.
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
