import styles from '@/shared/ui/AppButton/AppIconButton.module.css';
import type { ButtonHTMLAttributes } from 'react';

type AppIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly size?: 'small' | 'medium' | undefined;
};

/**
 * A round hover target around a lone icon. The icon is decorative by construction
 * (`aria-hidden` in the set), so the accessible name is this button's `aria-label` —
 * callers must pass one.
 */
export function AppIconButton({
  size = 'medium',
  className,
  type = 'button',
  ...rest
}: AppIconButtonProps) {
  const classes = [styles['iconButton'], size === 'small' ? styles['small'] : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...rest} />;
}
