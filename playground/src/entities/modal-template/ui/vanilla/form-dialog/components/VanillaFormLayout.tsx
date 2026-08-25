import type { CSSProperties, ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-dialog/styles.module.css';

type VanillaFormLayoutProps = {
  readonly children: ReactNode;
  readonly style?: CSSProperties | undefined;
};

export function VanillaFormLayout({ children, style }: VanillaFormLayoutProps) {
  return (
    <div className={styles['formLayout']} style={style}>
      {children}
    </div>
  );
}
