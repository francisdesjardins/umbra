import Box from '@mui/material/Box';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

type HeaderProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export function Header({ children, sx }: HeaderProps) {
  return <Box sx={mergeSx({ mb: 2, '& > *': { display: 'block' } }, sx)}>{children}</Box>;
}
