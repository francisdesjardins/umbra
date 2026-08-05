import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type HeadingProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Heading = ({ children, sx }: HeadingProps) => {
  return (
    <Typography variant="h6" color="text.primary" sx={sx}>
      {children}
    </Typography>
  );
};
