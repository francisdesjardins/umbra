import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/shared/content/styles.module.css';

type MessageProps = {
  readonly children: ReactNode;
  /** What `ariaDescribedBy` points at. An `alertdialog` wants one: assistive technology announces
   * its description on open rather than waiting to be read. */
  readonly id?: string | undefined;
};

export function Message({ children, id }: MessageProps) {
  return (
    <p id={id} className={styles['message']}>
      {children}
    </p>
  );
}
