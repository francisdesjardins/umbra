import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/ButtonRow.module.css';

type ButtonRowProps = {
  readonly children: ReactNode;
  /**
   * The calling template's footer class — taken rather than wrapped, since a footer *is* the row
   * of actions and a second flex box would only restate what the outer one already says.
   */
  readonly className?: string | undefined;
};

/**
 * Where a modal's actions sit, for every vanilla template, owning placement and not chrome — one
 * rule copied three ways drifts: 8px gap in the message footer, 16px in the form footer, and no
 * `display: flex` at all in the slide footer, leaving two actions left-aligned and touching.
 */
export function ButtonRow({ children, className }: ButtonRowProps) {
  // Joined, not interpolated: `noUncheckedIndexedAccess` makes the lookup possibly-undefined.
  const classes = [styles['buttonRow'], className]
    .filter((name) => {
      return name !== undefined && name !== '';
    })
    .join(' ');

  return <div className={classes}>{children}</div>;
}
