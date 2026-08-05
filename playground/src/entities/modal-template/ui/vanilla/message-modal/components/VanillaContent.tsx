import type { ReactNode } from 'react';
import { spacing } from '@/entities/modal-template/ui/shared/tokens';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaContentProps = {
  readonly children: ReactNode;
};

export function VanillaContent({ children }: VanillaContentProps) {
  return (
    <div
      className={styles['modalContent']}
      style={{ display: 'flex', flexDirection: 'column', gap: `${String(spacing.content)}px` }}
    >
      {children}
    </div>
  );
}
