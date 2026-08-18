import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/panel-modal/styles.module.css';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';

type VanillaPanelContentProps = {
  readonly children: ReactNode;
  /** `false` drops the inline padding, for full-bleed content like data tables. */
  readonly padding?: boolean | undefined;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

/**
 * Scrollable content area for big modals, filling the vertical space between the header and any
 * footer.
 */
export function VanillaPanelContent({ children, padding = true, label }: VanillaPanelContentProps) {
  const { ref, regionProps } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');
  const paddingClass = padding ? styles['panelContentPadded'] : styles['panelContentBleed'];

  return (
    <div className={[styles['panelContent'], paddingClass].join(' ')} ref={ref} {...regionProps}>
      {children}
    </div>
  );
}
