import { DialogContent, Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { spacing } from '@/entities/modal-template/ui/shared/tokens';

export type ContentProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps;
};

export const Content = ({ children, sx }: ContentProps) => {
  return (
    <DialogContent sx={mergeSx({ p: 0, flex: 1, overflowY: 'auto' }, sx)}>
      <Stack sx={{ gap: `${String(spacing.content)}px` }}>{children}</Stack>
    </DialogContent>
  );
};
