import { spacing } from '@/entities/modal-template/ui/shared/tokens';
import { Button as MuiButton, type ButtonProps as MuiButtonProps } from '@mui/material';

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
  // **This line is the seam.** The library ships the running state as `data-loading`, a DOM
  // attribute, because it has no way to know what your design system calls it — MUI says
  // `loading`, another says `busy`, a headless one says nothing and wants you to render the
  // spinner. Mapping it belongs here, in the wrapper that knows the answer, and nowhere else.
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
