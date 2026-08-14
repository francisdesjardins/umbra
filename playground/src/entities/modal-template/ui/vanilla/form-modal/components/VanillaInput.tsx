import type { InputHTMLAttributes } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/form-modal/styles.module.css';

/**
 * Everything an `<input>` takes, plus the one thing this template adds.
 *
 * **Spread, not enumerated, and that is the whole lesson of this file.** It used to declare
 * `id`/`type`/`value`/`onChange`/`error`/`placeholder` and drop the rest on the floor — so
 * `onBlur`, `name`, `aria-invalid` and `aria-describedby` never reached the element, and the
 * card lost its blur-time validation and its error association with no error anywhere. The
 * library's README gives the same warning about custom *button* wrappers and
 * `aria-keyshortcuts`: a wrapper that spreads `...rest` forwards what it never thought of, and
 * one that lists props forwards only what its author remembered.
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
