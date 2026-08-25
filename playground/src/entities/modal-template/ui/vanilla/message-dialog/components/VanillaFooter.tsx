import type { ReactNode } from 'react';
import { ButtonRow } from '@/entities/modal-template/ui/vanilla/shared/ButtonRow';
import styles from '@/entities/modal-template/ui/vanilla/message-dialog/styles.module.css';

type VanillaFooterProps = {
  readonly children: ReactNode;
};

export function VanillaFooter({ children }: VanillaFooterProps) {
  return <ButtonRow className={styles['modalFooter']}>{children}</ButtonRow>;
}
