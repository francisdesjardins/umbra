import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type MessageProps = {
  readonly children: ReactNode;
  /** What `ariaDescribedBy` points at — see the MUI `Message` for when an alertdialog wants one. */
  readonly id?: string | undefined;
};

export function Message({ children, id }: MessageProps) {
  return (
    <p id={id} className={styles['message']}>
      {children}
    </p>
  );
}
