import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type MessageProps = {
  readonly children: ReactNode;
};

export function Message({ children }: MessageProps) {
  return <p className={styles['message']}>{children}</p>;
}
