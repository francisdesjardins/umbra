import styles from '@/shared/ui/SelectionDropdown/SelectionDropdown.module.css';
import type { ReactNode, SelectHTMLAttributes } from 'react';

type SelectionDropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  readonly children: ReactNode;
  /** Fills its row rather than sizing to the longest option — what a labelled field wants. */
  readonly block?: boolean | undefined;
  /** Shorter than a field, for a control that sits in a header row beside icon buttons. */
  readonly compact?: boolean | undefined;
  readonly className?: string | undefined;
  readonly wrapperClassName?: string | undefined;
};

/**
 * The playground's `<select>` — native semantics, the app's chevron, and the form tokens on both
 * the control and its option popup.
 *
 * **Spread, not enumerated**: a wrapper listing `value`/`onChange` drops `aria-*` and `data-*`
 * silently, the same trap `AppButton` documents.
 */
export function SelectionDropdown({
  block = false,
  compact = false,
  className,
  wrapperClassName,
  children,
  ...rest
}: SelectionDropdownProps) {
  const wrapper = [styles['wrapper'], block ? styles['block'] : '', wrapperClassName ?? '']
    .filter(Boolean)
    .join(' ');
  const select = [styles['select'], compact ? styles['compact'] : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  const chevron = [styles['chevron'], rest.disabled === true ? styles['disabledChevron'] : '']
    .filter(Boolean)
    .join(' ');

  return (
    <span className={wrapper}>
      <select {...rest} className={select}>
        {children}
      </select>
      <svg viewBox="0 0 24 24" aria-hidden className={chevron}>
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
      </svg>
    </span>
  );
}
