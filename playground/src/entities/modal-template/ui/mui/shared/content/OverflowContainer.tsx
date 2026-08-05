import { Box, type BoxProps, type SxProps } from '@mui/material';
import { useRef, type ReactNode } from 'react';
import { useIsOverflowing } from '@/shared/lib/use-overflow';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { sizes } from '@/entities/modal-template/ui/shared/tokens';

export type OverflowContainerProps = {
  readonly children: ReactNode;

  /**
   * Base `sx` styles forwarded to the inner `Box`. `maxHeight` defaults to
   * `sizes.maxHeight` but can be overridden here.
   */
  readonly sx?: SxProps | undefined;

  /**
   * `sx` styles applied only while the container is overflowing vertically.
   * Use this for right padding, subtle background, etc.
   */
  readonly overflowSx?: SxProps | undefined;
} & Omit<BoxProps, 'sx' | 'style' | 'children' | 'overflow' | 'overflowX' | 'overflowY'>;

export const OverflowContainer = ({
  children,
  sx,
  overflowSx,
  ...boxRest
}: OverflowContainerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const { isOverflowing, scrollbarWidth } = useIsOverflowing(ref);

  return (
    <Box
      {...boxRest}
      ref={ref}
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
