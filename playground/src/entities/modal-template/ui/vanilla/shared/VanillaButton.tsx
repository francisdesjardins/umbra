import styles from '@/entities/modal-template/ui/vanilla/message-modal/styles.module.css';
import type { ComponentProps, ReactNode } from 'react';

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
  /** The running state as an action hands it over — mapped to `loading` below. */
  readonly 'data-loading'?: boolean | undefined;
  // Forwarded, not dropped: `focusOnOpen` finds its button by this attribute, so a wrapper that
  // destructures a fixed list and forgets it disables the feature without a sound.
  readonly 'data-focus-on-open'?: true | undefined;
  // Forwarded for the same reason as `aria-keyshortcuts`: a wrapper that accepts a spread and
  // silently drops an ARIA prop takes the behaviour away without saying so.
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
}: VanillaButtonProps) {
  // The same seam as the MUI wrapper: the library ships `data-loading`, this component decides
  // what that means for its own markup — here, a class. Nothing in the core had to guess.
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
