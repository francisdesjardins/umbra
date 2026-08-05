import { Button, CircularProgress, type ButtonProps } from '@mui/material';

type LoadingButtonProps = ButtonProps & {
  loading?: boolean | undefined;
};

export const LoadingButton = ({ loading, disabled, children, ...rest }: LoadingButtonProps) => {
  return (
    <Button {...rest} disabled={disabled || loading}>
      {loading ? <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} /> : null}
      {children}
    </Button>
  );
};
