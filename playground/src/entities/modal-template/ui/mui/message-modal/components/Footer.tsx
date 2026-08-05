import { Stack, type SxProps } from '@mui/material';
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
