import styles from '@/shared/ui/AppButton/AppButton.module.css';

export type AppButtonLook = {
  readonly variant?: 'contained' | 'outlined' | 'text' | undefined;
  readonly color?: 'primary' | 'error' | undefined;
  readonly size?: 'small' | 'medium' | undefined;
};

/**
 * The button recipe as a class list, for the elements that cannot be an `AppButton`.
 *
 * Two of those exist and both are deliberate. A **link** dressed as a button has to stay a real
 * `<a>`, or new-tab and copy-link stop working. A **dialog action's** button has to be one the
 * example writes itself, because `action(...)` spreads `aria-keyshortcuts`, `data-focus-on-open`
 * and `data-action-reason` onto it and a wrapper that enumerates props drops them silently.
 *
 * Everything else uses `AppButton`. This exists so those two do not re-declare the metrics — which
 * is how the shell came to own three copies of the same button, each needing the same edit.
 *
 * It lives beside the component rather than inside it because a module that exports both a
 * component and a function loses Fast Refresh.
 */
export function appButtonClass({
  variant = 'text',
  color = 'primary',
  size = 'medium',
}: AppButtonLook = {}): string {
  const variantClass =
    variant === 'contained'
      ? color === 'error'
        ? styles['containedError']
        : styles['contained']
      : variant === 'outlined'
        ? styles['outlined']
        : styles['text'];

  return [styles['button'], size === 'small' ? styles['small'] : styles['medium'], variantClass]
    .filter(Boolean)
    .join(' ');
}
