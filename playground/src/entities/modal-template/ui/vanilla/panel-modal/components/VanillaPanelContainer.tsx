import type { CSSProperties, ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/panel-modal/styles.module.css';

type VanillaPanelContainerProps = {
  readonly children: ReactNode;
  /** Sizing belongs to the caller — a panel is as wide as its use case, not its template. */
  readonly style?: CSSProperties | undefined;
};

/**
 * Full-size container for big/complex modals (wizards, large forms, tables): a flex-column frame
 * with a border and background, leaving dividers and spacing to the caller.
 *
 * ```tsx
 * <PanelModal.PanelContainer style={{ width: 600 }}>
 *   <PanelModal.PanelHeader>…</PanelModal.PanelHeader>
 *   <PanelModal.Divider />
 *   <PanelModal.PanelContent>…</PanelModal.PanelContent>
 *   <PanelModal.Divider />
 *   <PanelModal.PanelFooter>…</PanelModal.PanelFooter>
 * </PanelModal.PanelContainer>
 * ```
 */
export function VanillaPanelContainer({ children, style }: VanillaPanelContainerProps) {
  return (
    <div className={styles['panelContainer']} style={style}>
      {children}
    </div>
  );
}
