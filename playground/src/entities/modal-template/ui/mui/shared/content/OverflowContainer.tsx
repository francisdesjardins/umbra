import { Box, type BoxProps, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';
import { sizes } from '@/entities/modal-template/ui/shared/tokens';

export type OverflowContainerProps = {
  readonly children: ReactNode;

  /** Base `sx` for the inner `Box`; `maxHeight` defaults to `sizes.maxHeight` and is overridable. */
  readonly sx?: SxProps | undefined;

  /** `sx` applied only while overflowing vertically — right padding, subtle background, etc. */
  readonly overflowSx?: SxProps | undefined;

  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
} & Omit<BoxProps, 'sx' | 'style' | 'children' | 'overflow' | 'overflowX' | 'overflowY'>;

export const OverflowContainer = ({
  children,
  sx,
  overflowSx,
  label,
  ...boxRest
}: OverflowContainerProps) => {
  const { ref, isOverflowing, scrollbarWidth, regionProps } = useScrollRegion<HTMLDivElement>(
    label ?? 'Scrollable content'
  );

  return (
    <Box
      {...boxRest}
      ref={ref}
      {...regionProps}
      sx={mergeSx(
        {
          maxHeight: sizes.maxHeight,
          overflowY: 'auto',
          py: 1,
          px: 0,
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
