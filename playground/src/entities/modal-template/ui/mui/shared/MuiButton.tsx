import { Button as MuiButton, type ButtonProps as MuiButtonProps } from '@mui/material';
import { spacing } from '@/entities/modal-template/ui/shared/tokens';

export type ButtonProps = Omit<MuiButtonProps, 'disabled'> & {
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly hotkeyLabel?: string | undefined;
};

export function Button({
  loading,
  disabled = false,
  hotkeyLabel,
  children,
  ...props
}: ButtonProps) {
  // `loading` reaches MUI, which renders its own spinner. The extra `disabled` is for callers
  // passing `loading` by hand; an action's props already carry it.
  const isDisabled: boolean = disabled || Boolean(loading);
  return (
    <MuiButton disabled={isDisabled} loading={loading} {...props}>
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
