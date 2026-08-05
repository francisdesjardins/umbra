import type { SlideDirection } from 'umbra/react';
import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/slide-modal/styles.module.css';

type VanillaDefaultLayoutProps = {
  readonly children: ReactNode;
  readonly direction?: SlideDirection | undefined;
};

export function VanillaDefaultLayout({ children, direction = 'left' }: VanillaDefaultLayoutProps) {
  const sideClass =
    direction === 'left'
      ? styles['slideLeft']
      : direction === 'right'
        ? styles['slideRight']
        : direction === 'top'
          ? styles['slideTop']
          : styles['slideBottom'];

  return <div className={[styles['slideLayout'], sideClass].join(' ')}>{children}</div>;
}
