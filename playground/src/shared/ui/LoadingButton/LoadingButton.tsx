import { Spinner } from '@/shared/ui/Spinner';
import { AppButton } from '@/shared/ui/AppButton';
import type { ComponentProps } from 'react';

type LoadingButtonProps = ComponentProps<typeof AppButton> & {
  loading?: boolean | undefined;
};

export const LoadingButton = ({ loading, disabled, children, ...rest }: LoadingButtonProps) => {
  return (
    <AppButton {...rest} disabled={disabled || loading}>
      {loading ? (
        // SMIL, not keyframes: the rotation rides the markup, so the spinner needs no stylesheet.
        // Off-scale 18px: inline with the button's label, not on the icon grid.
        <Spinner size={18} />
      ) : null}
      {children}
    </AppButton>
  );
};
