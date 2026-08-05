import type { ComponentProps, ReactNode } from 'react';
import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';

type VanillaButtonProps = {
  readonly children: ReactNode;
  // Typed from React's own button props: this is handed straight to a <button>, which calls
  // it with an event — and an action's click handler needs that event.
  readonly onClick?: ComponentProps<'button'>['onClick'] | undefined;
  readonly disabled?: boolean | undefined;
  readonly variant?: 'default' | 'primary' | undefined;
  readonly loading?: boolean | undefined;
  readonly hotkeyLabel?: string | undefined;
  readonly 'aria-keyshortcuts'?: string | undefined;
  // Forwarded for the same reason as `aria-keyshortcuts`: a wrapper that accepts a spread and
  // silently drops an ARIA prop takes the behaviour away without saying so.
  readonly 'aria-busy'?: boolean | undefined;
};

export function VanillaButton({
  children,
  onClick,
  disabled = false,
  variant = 'default',
  loading = false,
  hotkeyLabel,
  'aria-keyshortcuts': ariaKeyshortcuts,
  'aria-busy': ariaBusy,
}: VanillaButtonProps) {
  const className = [
    styles['button'],
    variant === 'primary' ? styles['buttonPrimary'] : '',
    loading ? styles['loading'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      {...(ariaKeyshortcuts !== undefined && { 'aria-keyshortcuts': ariaKeyshortcuts })}
      {...(ariaBusy !== undefined && { 'aria-busy': ariaBusy })}
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
