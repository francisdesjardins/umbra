import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/panel-dialog/styles.module.css';

type VanillaPanelFooterProps = {
  readonly children: ReactNode;
  /** Action alignment: `'end'` (default), `'start'`, or `'space-between'` for wizard back/next. */
  readonly justify?: 'start' | 'end' | 'space-between' | undefined;
};

/**
 * Footer for big/complex modals — padding and action alignment only; compose a `<Divider />`
 * before it for visual separation. See `PanelContainer` for the full composition.
 */
export function VanillaPanelFooter({ children, justify = 'end' }: VanillaPanelFooterProps) {
  const justifyClass =
    justify === 'start'
      ? styles['panelFooterStart']
      : justify === 'space-between'
        ? styles['panelFooterSpaceBetween']
        : '';

  return (
    <div className={[styles['panelFooter'], justifyClass].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
