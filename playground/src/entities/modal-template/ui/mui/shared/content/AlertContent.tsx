import Alert from '@mui/material/Alert';
import { type SxProps } from '@mui/material/styles';
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
