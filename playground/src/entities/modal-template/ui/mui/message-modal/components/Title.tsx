import { DialogTitle } from '@mui/material';
import type { ReactNode } from 'react';

export type TitleProps = {
  readonly children: ReactNode;
  readonly sx?: object;
  /**
   * What `ariaLabelledBy` points at. Without it the heading exists and is unaddressable, so the
   * only way to name the dialog is to repeat the title as a string — which is how the two drift.
   */
  readonly id?: string | undefined;
};

export const Title = ({ children, sx, id }: TitleProps) => {
  return (
    <DialogTitle id={id} sx={{ p: 0, ...sx }}>
      {children}
    </DialogTitle>
  );
};
