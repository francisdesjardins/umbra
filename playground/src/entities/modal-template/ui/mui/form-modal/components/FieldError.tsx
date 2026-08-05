import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type FieldErrorProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const FieldError = ({ children, sx }: FieldErrorProps) => {
  return (
    <Typography variant="caption" color="error" sx={mergeSx({ mt: 0.5 }, sx)}>
      {children}
    </Typography>
  );
};
