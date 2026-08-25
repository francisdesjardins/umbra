import type { ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/shared/content/styles.module.css';

type DetailListProps = {
  readonly items: readonly ReactNode[];
  /** Rendered in a fixed 32px slot before every item, so rows align with and without one. */
  readonly icon?: ReactNode | undefined;
  readonly dense?: boolean | undefined;
};

export function DetailList({ items, icon, dense = true }: DetailListProps) {
  return (
    <ul
      className={[styles['detailList'], dense ? styles['detailListDense'] : '']
        .filter(Boolean)
        .join(' ')}
    >
      {items.map((item, index) => {
        return (
          <li key={index} className={styles['detailListItem']}>
            {icon !== undefined && (
              <span className={styles['detailListIcon']} aria-hidden>
                {icon}
              </span>
            )}
            <span className={styles['detailListText']}>{item}</span>
          </li>
        );
      })}
    </ul>
  );
}
