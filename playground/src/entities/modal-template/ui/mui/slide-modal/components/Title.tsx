import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type TitleProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /** What the panel's `ariaLabelledBy` points at — see the message template's `Title`. */
  readonly id?: string | undefined;
};

export const Title = ({ children, sx, id }: TitleProps) => {
  return (
    <Typography id={id} variant="h6" sx={mergeSx({ fontWeight: 600, color: 'text.primary' }, sx)}>
      {children}
    </Typography>
  );
};
