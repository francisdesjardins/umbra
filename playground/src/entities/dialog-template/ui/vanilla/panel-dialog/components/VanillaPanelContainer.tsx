import type { CSSProperties, ReactNode } from 'react';
import styles from '@/entities/dialog-template/ui/vanilla/panel-dialog/styles.module.css';

type VanillaPanelContainerProps = {
  readonly children: ReactNode;
  /** Sizing belongs to the caller — a panel is as wide as its use case, not its template. */
  readonly style?: CSSProperties | undefined;
};

/**
 * Full-size container for big/complex dialogs (wizards, large forms, tables): a flex-column frame
 * with a border and background, leaving dividers and spacing to the caller.
 *
 * ```tsx
 * <PanelDialog.PanelContainer style={{ width: 600 }}>
 *   <PanelDialog.PanelHeader>…</PanelDialog.PanelHeader>
 *   <PanelDialog.Divider />
 *   <PanelDialog.PanelContent>…</PanelDialog.PanelContent>
 *   <PanelDialog.Divider />
 *   <PanelDialog.PanelFooter>…</PanelDialog.PanelFooter>
 * </PanelDialog.PanelContainer>
 * ```
 */
export function VanillaPanelContainer({ children, style }: VanillaPanelContainerProps) {
  return (
    <div className={styles['panelContainer']} style={style}>
      {children}
    </div>
  );
}
