import styles from '@/entities/dialog-template/ui/vanilla/message-dialog/styles.module.css';
import type { ComponentProps, ReactNode } from 'react';

/**
 * A dialog's icon-only control — the ✕, and the glyphs that sit beside it.
 *
 * It exists because the hover is a state an inline `style` cannot carry, and three of these had
 * one written inline and therefore no hover at all. Everything else is {@link VanillaButton}'s
 * contract, forwarding included: an icon button is spread with `{...action('close')}` like any
 * other, so dropping `aria-keyshortcuts`, `data-focus-on-open` or `data-action-reason` here would
 * silently disable a hotkey, an opening focus claim or a focus restore.
 */
type VanillaIconButtonProps = {
  /** The glyph. An `aria-hidden` `<svg>`, since the name is on the button. */
  readonly children: ReactNode;
  /** Required: an icon button has no text to be named by. */
  readonly 'aria-label': string;
  readonly title?: string | undefined;
  readonly onClick?: ComponentProps<'button'>['onClick'] | undefined;
  readonly disabled?: boolean | undefined;
  readonly 'aria-keyshortcuts'?: string | undefined;
  readonly 'data-loading'?: boolean | undefined;
  readonly 'data-focus-on-open'?: true | undefined;
  readonly 'data-action-reason'?: string | undefined;
  readonly 'aria-busy'?: boolean | undefined;
};

export function VanillaIconButton({
  children,
  'aria-label': ariaLabel,
  title,
  onClick,
  disabled = false,
  'aria-keyshortcuts': ariaKeyshortcuts,
  'aria-busy': ariaBusy,
  'data-loading': dataLoading,
  'data-focus-on-open': dataFocusOnOpen,
  'data-action-reason': dataActionReason,
}: VanillaIconButtonProps) {
  const busy: boolean = dataLoading ?? false;

  return (
    <button
      type="button"
      className={styles['iconButton']}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || busy}
      data-loading={busy}
      {...(title !== undefined && { title })}
      {...(ariaKeyshortcuts !== undefined && { 'aria-keyshortcuts': ariaKeyshortcuts })}
      {...(ariaBusy !== undefined && { 'aria-busy': ariaBusy })}
      {...(dataFocusOnOpen !== undefined && { 'data-focus-on-open': dataFocusOnOpen })}
      {...(dataActionReason !== undefined && { 'data-action-reason': dataActionReason })}
    >
      {children}
    </button>
  );
}
