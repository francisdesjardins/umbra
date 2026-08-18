import Stack from '@mui/material/Stack';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type FooterProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Footer = ({ children, sx }: FooterProps) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={mergeSx({ flexShrink: 0, justifyContent: 'flex-end' }, sx)}
    >
      {children}
    </Stack>
  );
};
