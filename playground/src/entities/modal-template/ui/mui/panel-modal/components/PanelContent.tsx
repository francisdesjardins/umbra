import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';

export type PanelContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /** `false` drops the default `px: 3`, for full-bleed content like data tables. */
  readonly padding?: boolean | undefined;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

/**
 * Scrollable content area for big modals, filling the vertical space between the header and any
 * footer.
 */
export const PanelContent = ({ children, sx, padding = true, label }: PanelContentProps) => {
  const { ref, regionProps } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');

  return (
    <Box
      ref={ref}
      {...regionProps}
      sx={mergeSx(
        {
          flex: 1,
          overflowY: 'auto',
          py: 2.5,
          ...(padding ? { px: 3 } : { px: 0 }),
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
