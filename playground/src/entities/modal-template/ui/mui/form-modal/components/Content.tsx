import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

type ContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export function Content({ children, sx }: ContentProps) {
  return (
    <Box sx={mergeSx({ display: 'flex', flexDirection: 'column', gap: 2 }, sx)}>{children}</Box>
  );
}
