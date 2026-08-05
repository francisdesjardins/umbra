import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { sizes } from '@/entities/modal-template/ui/shared/tokens';

export type DefaultContainerProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const DefaultContainer = ({ children, sx }: DefaultContainerProps) => {
  return (
    <Box
      sx={mergeSx(
        {
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: 'none',
          minWidth: { xs: 'auto', sm: sizes.minWidth },
          maxWidth: { xs: '92vw', sm: sizes.maxWidth },
          backgroundColor: 'var(--modal-bg)',
          backgroundImage: 'none',
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
