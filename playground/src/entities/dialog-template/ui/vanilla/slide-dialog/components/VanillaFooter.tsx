import type { ReactNode } from 'react';
import { ButtonRow } from '@/entities/dialog-template/ui/vanilla/shared/ButtonRow';
import styles from '@/entities/dialog-template/ui/vanilla/slide-dialog/styles.module.css';

type VanillaFooterProps = {
  readonly children: ReactNode;
};

export function VanillaFooter({ children }: VanillaFooterProps) {
  return <ButtonRow className={styles['slideFooter']}>{children}</ButtonRow>;
}
