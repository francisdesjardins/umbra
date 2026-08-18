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
        <svg viewBox="0 0 24 24" aria-hidden style={{ width: 18, height: 18, flexShrink: 0 }}>
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="42 18"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </svg>
      ) : null}
      {children}
    </AppButton>
  );
};
