import { Box, type SxProps } from '@mui/material';
import type { SlideDirection } from 'umbra/react';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type DefaultLayoutProps = {
  readonly children: ReactNode;
  readonly direction: SlideDirection;
  readonly sx?: SxProps | undefined;
};

export const DefaultLayout = ({ children, direction, sx }: DefaultLayoutProps) => {
  const isHorizontal = direction === 'left' || direction === 'right';

  return (
    <Box
      sx={mergeSx(
        {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          overflow: 'hidden',
          backgroundColor: 'var(--modal-bg)',
          backgroundImage: 'none',
          color: 'text.primary',
          ...(isHorizontal
            ? {
                width: { xs: '100dvw', sm: 400 },
                minWidth: { xs: 'auto', sm: 320 },
                maxWidth: { xs: '100dvw', sm: 640 },
              }
            : { height: 300, maxHeight: '80dvh' }),
          ...(direction === 'left' ? { borderRight: '1px solid', borderColor: 'divider' } : {}),
          ...(direction === 'right' ? { borderLeft: '1px solid', borderColor: 'divider' } : {}),
          ...(direction === 'top' ? { borderBottom: '1px solid', borderColor: 'divider' } : {}),
          ...(direction === 'bottom' ? { borderTop: '1px solid', borderColor: 'divider' } : {}),
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
