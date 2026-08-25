import type { InputHTMLAttributes } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-dialog/styles.module.css';

/**
 * Everything an `<input>` takes, plus the one thing this template adds. **Spread, not enumerated**:
 * a wrapper listing `id`/`type`/`value`/`onChange` drops `onBlur`, `name`, `aria-invalid` and
 * `aria-describedby`, silently costing blur-time validation and error association — the same trap
 * the README flags for custom button wrappers and `aria-keyshortcuts`.
 */
type VanillaInputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Paints the error boundary. Not `aria-invalid` — the caller sets that, and it is forwarded. */
  readonly error?: boolean | undefined;
};

export function VanillaInput({
  type = 'text',
  error = false,
  className,
  ...rest
}: VanillaInputProps) {
  const classes = [styles['input'], error ? styles['error'] : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return <input type={type} className={classes} {...rest} />;
}
