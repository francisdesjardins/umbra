import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/panel-modal/styles.module.css';

type VanillaHeaderActionLayoutProps = {
  /** Left slot — grows, with a 10rem floor so a wide `actions` side cannot starve it. */
  readonly content: ReactNode;
  /** Right slot — never shrinks. Icon buttons, actions, step indicators. */
  readonly actions?: ReactNode | undefined;
};

/**
 * Composable header row: `content` left, `actions` right, wrapping when they no longer fit — the
 * wrap-instead-of-starve reasoning lives on the `.headerActionContent` rule in the CSS module.
 */
export function VanillaHeaderActionLayout({ content, actions }: VanillaHeaderActionLayoutProps) {
  return (
    <div className={styles['headerActionRow']}>
      <div className={styles['headerActionContent']}>{content}</div>
      {actions !== undefined && <div className={styles['headerActionActions']}>{actions}</div>}
    </div>
  );
}
