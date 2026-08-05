import { Alert, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type AlertContentProps = {
  readonly children: ReactNode;
  readonly severity?: 'error' | 'warning' | 'info' | 'success' | undefined;
  readonly sx?: SxProps | undefined;
};

export const AlertContent = ({ children, severity = 'info', sx }: AlertContentProps) => {
  return (
    <Alert severity={severity} sx={sx}>
      {children}
    </Alert>
  );
};
