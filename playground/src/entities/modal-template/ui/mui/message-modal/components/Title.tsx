import { DialogTitle } from '@mui/material';
import type { ReactNode } from 'react';

export type TitleProps = {
  readonly children: ReactNode;
  readonly sx?: object;
};

export const Title = ({ children, sx }: TitleProps) => {
  return <DialogTitle sx={{ p: 0, ...sx }}>{children}</DialogTitle>;
};
