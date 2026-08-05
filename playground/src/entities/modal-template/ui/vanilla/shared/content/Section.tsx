import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/content/styles.module.css';

type SectionProps = {
  readonly title: string;
  readonly children: ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <div className={styles['section']}>
      <h4 className={styles['sectionTitle']}>{title}</h4>
      {children}
    </div>
  );
}
