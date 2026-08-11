import { Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type MessageProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /**
   * What `ariaDescribedBy` points at, when there is one.
   *
   * An `alertdialog` is announced with its description rather than waiting to be read, so the body
   * has to be addressable for the role to be worth much. Not always though: the APG says to omit
   * the description when the content has structure — lists, tables, several paragraphs — since it
   * would be read out as one unbroken string.
   */
  readonly id?: string | undefined;
};

export const Message = ({ children, sx, id }: MessageProps) => {
  return (
    <Typography id={id} variant="body1" color="text.primary" sx={sx}>
      {children}
    </Typography>
  );
};
