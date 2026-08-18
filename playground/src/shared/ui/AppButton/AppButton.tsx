import styles from '@/shared/ui/AppButton/AppButton.module.css';
import type { ButtonHTMLAttributes } from 'react';

/**
 * Everything a `<button>` takes, plus the three knobs the shell uses. **Spread, not
 * enumerated**: a wrapper listing `onClick`/`disabled` drops `aria-*` and `data-*` silently —
 * the same trap the templates' own button documents.
 */
type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: 'contained' | 'outlined' | 'text' | undefined;
  readonly color?: 'primary' | 'error' | undefined;
  readonly size?: 'small' | 'medium' | undefined;
};

/** The shell's own button — app tokens, no component library. Dialog interiors never use it;
 * they have the templates' buttons. */
export function AppButton({
  variant = 'text',
  color = 'primary',
  size = 'medium',
  className,
  type = 'button',
  ...rest
}: AppButtonProps) {
  const variantClass =
    variant === 'contained'
      ? color === 'error'
        ? styles['containedError']
        : styles['contained']
      : variant === 'outlined'
        ? styles['outlined']
        : styles['text'];

  const classes = [
    styles['button'],
    size === 'small' ? styles['small'] : styles['medium'],
    variantClass,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...rest} />;
}
