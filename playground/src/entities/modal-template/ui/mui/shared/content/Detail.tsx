import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type DetailProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Detail = ({ children, sx }: DetailProps) => {
  return (
    <Typography variant="body2" color="text.secondary" sx={sx}>
      {children}
    </Typography>
  );
};
