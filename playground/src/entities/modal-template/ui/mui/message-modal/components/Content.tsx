import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { useScrollRegion } from '@/entities/modal-template/ui/shared/scroll-region';
import { spacing } from '@/entities/modal-template/ui/shared/tokens';

export type ContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps;
  /** Accessible name the region announces when it scrolls — see `useScrollRegion`. */
  readonly label?: string | undefined;
};

export const Content = ({ children, sx, label }: ContentProps) => {
  const { ref, regionProps, regionSx } = useScrollRegion<HTMLDivElement>(label ?? 'Dialog content');

  return (
    <DialogContent
      ref={ref}
      {...regionProps}
      sx={mergeSx({ ...regionSx, flex: 1, overflowY: 'auto' }, sx)}
    >
      <Stack sx={{ gap: `${String(spacing.content)}px` }}>{children}</Stack>
    </DialogContent>
  );
};
