import Box from '@mui/material/Box';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/mui/shared/sxUtils';

const justifyMap = {
  start: 'flex-start',
  end: 'flex-end',
  'space-between': 'space-between',
} as const;

type FooterProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  readonly justify?: 'start' | 'end' | 'space-between' | undefined;
};

export function Footer({ children, sx, justify = 'end' }: FooterProps) {
  return (
    <Box sx={mergeSx({ display: 'flex', justifyContent: justifyMap[justify], gap: 1, mt: 2 }, sx)}>
      {children}
    </Box>
  );
}
