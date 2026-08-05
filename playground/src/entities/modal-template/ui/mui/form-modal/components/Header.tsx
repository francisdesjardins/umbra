import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

type HeaderProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export function Header({ children, sx }: HeaderProps) {
  return <Box sx={mergeSx({ mb: 2, '& > *': { display: 'block' } }, sx)}>{children}</Box>;
}
