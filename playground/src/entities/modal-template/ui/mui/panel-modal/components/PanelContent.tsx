import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /**
   * When `false`, removes the default `px: 3` horizontal padding — useful when
   * the content is a full-bleed table or custom layout.
   */
  readonly padding?: boolean | undefined;
};

/**
 * Scrollable content area for big modals. Fills all available vertical space
 * between the header and (optional) footer. Horizontal padding is on by
 * default and can be turned off for full-bleed content like data tables.
 */
export const PanelContent = ({ children, sx, padding = true }: PanelContentProps) => {
  return (
    <Box
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
