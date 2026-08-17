import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';

export type PanelContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /**
   * When `false`, removes the default `px: 3` horizontal padding — useful when
   * the content is a full-bleed table or custom layout.
   */
  readonly padding?: boolean | undefined;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

/**
 * Scrollable content area for big modals. Fills all available vertical space
 * between the header and (optional) footer. Horizontal padding is on by
 * default and can be turned off for full-bleed content like data tables.
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
