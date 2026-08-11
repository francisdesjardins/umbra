import type { ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/shared/ButtonRow.module.css';

type ButtonRowProps = {
  readonly children: ReactNode;
  /**
   * The calling template's own footer class — its padding, and the rule above it where it has one.
   *
   * Taken rather than wrapped: a footer *is* the row of actions, so nesting a second flex box
   * inside it would add an element to every copied template to say something the outer one is
   * already positioned to say.
   */
  readonly className?: string | undefined;
};

/**
 * Where a modal's actions sit — one component, for every vanilla template.
 *
 * It exists because there were three copies of the rule and they had already drifted apart: the
 * message footer flexed its buttons to the trailing edge with an 8px gap, the form footer used 16,
 * and the slide footer had no `display: flex` at all, so two actions sat left-aligned and
 * touching. None of that took a mistake — three places to remember is enough on its own.
 *
 * A footer keeps its own chrome (padding, and the rule above it where the template has one); this
 * owns the placement and nothing else, which is why a template can adopt it without giving up how
 * it looks.
 */
export function ButtonRow({ children, className }: ButtonRowProps) {
  // Joined rather than interpolated: `noUncheckedIndexedAccess` types a CSS-module lookup as
  // possibly-undefined, and a template literal would either print "undefined" or need a cast.
  const classes = [styles['buttonRow'], className]
    .filter((name) => {
      return name !== undefined && name !== '';
    })
    .join(' ');

  return <div className={classes}>{children}</div>;
}
