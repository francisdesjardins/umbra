import styles from '@/entities/dialog-template/ui/vanilla/panel-dialog/styles.module.css';

/**
 * The hairline the MUI composition gets from `<Divider />` — vanilla has no component library to
 * borrow one from, so the panel group ships its own. Layout hairline only (`--panel-border`);
 * 1.4.11 asks nothing of a line that separates two areas of one surface.
 */
export function VanillaPanelDivider() {
  return <hr className={styles['panelDivider']} aria-hidden />;
}
