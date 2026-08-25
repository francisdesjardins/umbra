import type { ReactNode } from 'react';
import { ButtonRow } from '@/entities/dialog-template/ui/vanilla/shared/ButtonRow';
import styles from '@/entities/dialog-template/ui/vanilla/form-dialog/styles.module.css';

type FooterProps = {
  readonly children: ReactNode;
};

export function VanillaFooter({ children }: FooterProps) {
  return <ButtonRow className={styles['formFooter']}>{children}</ButtonRow>;
}
