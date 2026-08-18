import { spacing } from '@/entities/modal-template/ui/shared/tokens';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';

export type ButtonProps = Omit<MuiButtonProps, 'disabled'> & {
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly hotkeyLabel?: string | undefined;
  /** The running state as an action hands it over — see the mapping below. */
  readonly 'data-loading'?: boolean | undefined;
};

export function Button({
  loading,
  disabled = false,
  hotkeyLabel,
  children,
  ...props
}: ButtonProps) {
  // **The seam**: the library ships the running state as the DOM attribute `data-loading` because
  // it cannot know your design system's word for it (MUI: `loading`; others: `busy`, or nothing at
  // all); mapping belongs here, in the wrapper that knows.
  const busy: boolean = loading ?? props['data-loading'] ?? false;
  return (
    <MuiButton disabled={disabled || busy} loading={busy} {...props}>
      {children}
      {hotkeyLabel && (
        <kbd
          style={{
            marginLeft: spacing.small,
            padding: '1px 5px',
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
    </MuiButton>
  );
}
