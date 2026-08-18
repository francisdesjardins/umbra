import Box from '@mui/material/Box';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/mui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';
import { focusRingSpace } from '@/entities/modal-template/ui/shared/tokens';

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
  const { ref, regionProps, regionSx } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');

  return (
    <Box
      ref={ref}
      {...regionProps}
      sx={mergeSx(
        {
          flex: 1,
          overflowY: 'auto',
          py: 2.5,
          // `px: 0` leaves a flush control's ring nothing to occupy; `regionSx` is the reserve, and
          // the inline padding below wins over it whenever this panel is padded at all.
          ...regionSx,
          ...(padding ? { px: 3 } : { px: focusRingSpace, mx: `calc(-1 * ${focusRingSpace})` }),
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
