import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type MessageProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Message = ({ children, sx }: MessageProps) => {
  return (
    <Typography variant="body1" color="text.primary" sx={sx}>
      {children}
    </Typography>
  );
};
