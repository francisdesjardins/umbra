import Typography from '@mui/material/Typography';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type HeadingProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /** What a form modal's `ariaLabelledBy` points at — this is the heading such a modal has. */
  readonly id?: string | undefined;
};

export const Heading = ({ children, sx, id }: HeadingProps) => {
  return (
    <Typography id={id} variant="h6" color="text.primary" sx={sx}>
      {children}
    </Typography>
  );
};
