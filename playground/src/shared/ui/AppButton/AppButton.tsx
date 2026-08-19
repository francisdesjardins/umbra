import { appButtonClass, type AppButtonLook } from '@/shared/ui/AppButton/buttonRecipe';
import type { ButtonHTMLAttributes } from 'react';

/**
 * Everything a `<button>` takes, plus the three knobs the shell uses. **Spread, not
 * enumerated**: a wrapper listing `onClick`/`disabled` drops `aria-*` and `data-*` silently —
 * the same trap the templates' own button documents.
 */
type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & AppButtonLook;

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
  const classes = [appButtonClass({ variant, color, size }), className ?? '']
    .filter(Boolean)
    .join(' ');

  return <button type={type} className={classes} {...rest} />;
}
