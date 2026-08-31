import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';
import type { ComponentProps, ReactNode } from 'react';

type VanillaButtonProps = {
  readonly children: ReactNode;
  // React's own button props: handed straight to a <button>, and an action's handler needs the event.
  readonly onClick?: ComponentProps<'button'>['onClick'] | undefined;
  readonly disabled?: boolean | undefined;
  readonly variant?: 'default' | 'primary' | undefined;
  readonly loading?: boolean | undefined;
  readonly hotkeyLabel?: string | undefined;
  readonly 'aria-keyshortcuts'?: string | undefined;
  /** The running state as an action hands it over — mapped to `loading` below. */
  readonly 'data-loading'?: boolean | undefined;
  // Forwarded, not dropped: `focusOnOpen` finds its button by this attribute.
  readonly 'data-focus-on-open'?: true | undefined;
  // How the focus restore finds this button once the action settles, on a renderer that replaces
  // the node rather than updating it.
  readonly 'data-action-reason'?: string | undefined;
  // Forwarded for the same reason as `aria-keyshortcuts`: dropping an ARIA prop is silent.
  readonly 'aria-busy'?: boolean | undefined;
};

export function VanillaButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  loading,
  hotkeyLabel,
  'aria-keyshortcuts': ariaKeyshortcuts,
  'aria-busy': ariaBusy,
  'data-loading': dataLoading,
  'data-focus-on-open': dataFocusOnOpen,
  'data-action-reason': dataActionReason,
}: VanillaButtonProps) {
  // The seam every button wrapper sits on: the library ships `data-loading` and never guesses
  // what a design system calls busy, so this decides — here, a class.
  const busy: boolean = loading ?? dataLoading ?? false;
  const className = [
    styles['button'],
    variant === 'primary' ? styles['buttonPrimary'] : '',
    busy ? styles['loading'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || busy}
      data-loading={busy}
      {...(ariaKeyshortcuts !== undefined && { 'aria-keyshortcuts': ariaKeyshortcuts })}
      {...(ariaBusy !== undefined && { 'aria-busy': ariaBusy })}
      {...(dataFocusOnOpen !== undefined && { 'data-focus-on-open': dataFocusOnOpen })}
      {...(dataActionReason !== undefined && { 'data-action-reason': dataActionReason })}
    >
      {children}
      {hotkeyLabel && (
        <kbd
          style={{
            marginLeft: 6,
            padding: '1px 4px',
            fontSize: '0.75em',
            fontFamily: 'inherit',
            opacity: 0.7,
            border: '1px solid currentColor',
            borderRadius: 3,
          }}
        >
          {hotkeyLabel}
        </kbd>
      )}
    </button>
  );
}
