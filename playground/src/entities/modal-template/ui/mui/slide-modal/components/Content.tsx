import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useIsOverflowing } from '@/shared/lib/use-overflow';
import { Box, type SxProps } from '@mui/material';
import { useRef, type ReactNode } from 'react';

export type ContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  readonly overflowSx?: SxProps | undefined;
};

export const Content = ({ children, sx, overflowSx }: ContentProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { isOverflowing, scrollbarWidth } = useIsOverflowing(ref);

  return (
    <Box
      ref={ref}
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
