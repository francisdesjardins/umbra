import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type HintProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Hint = ({ children, sx }: HintProps) => {
  return (
    <Typography variant="caption" color="text.disabled" sx={sx}>
      {children}
    </Typography>
  );
};
