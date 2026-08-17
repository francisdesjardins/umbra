import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';
import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type ContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  readonly overflowSx?: SxProps | undefined;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

export const Content = ({ children, sx, overflowSx, label }: ContentProps) => {
  const { ref, isOverflowing, scrollbarWidth, regionProps } = useScrollRegion<HTMLDivElement>(
    label ?? 'Dialog content'
  );

  return (
    <Box
      ref={ref}
      {...regionProps}
      sx={mergeSx(
        {
          flex: 1,
          overflowY: 'auto',
          p: 3,
          '--scrollbar-width': `${String(scrollbarWidth)}px`,
        },
        sx,
        isOverflowing ? overflowSx : null
      )}
    >
      {children}
    </Box>
  );
};
