import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/panel-modal/styles.module.css';

type VanillaPanelHeaderProps = {
  readonly children: ReactNode;
};

/**
 * Header shell for big/complex modals — padding only; compose a `<Divider />` after it for visual
 * separation, and a `HeaderActionLayout` inside it. See `PanelContainer` for the full composition.
 */
export function VanillaPanelHeader({ children }: VanillaPanelHeaderProps) {
  return <div className={styles['panelHeader']}>{children}</div>;
}
