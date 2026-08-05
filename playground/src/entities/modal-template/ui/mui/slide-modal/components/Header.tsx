import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type SlideHeaderProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Header = ({ children, sx }: SlideHeaderProps) => {
  return (
    <Box
      sx={mergeSx(
        {
          flexShrink: 0,
          p: 3,
          pt: 'calc(24px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
