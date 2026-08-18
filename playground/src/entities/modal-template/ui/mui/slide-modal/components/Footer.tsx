import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/mui/shared/sxUtils';

const justifyMap = {
  start: 'flex-start',
  end: 'flex-end',
  'space-between': 'space-between',
} as const;

export type MuiSlideFooterProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  readonly justify?: 'start' | 'end' | 'space-between' | undefined;
};

export function MuiSlideFooter({ children, sx, justify = 'end' }: MuiSlideFooterProps) {
  return (
    <Box
      sx={mergeSx(
        {
          flexShrink: 0,
          p: 3,
          pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid',
          borderColor: 'divider',
        },
        sx
      )}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: justifyMap[justify] }}>
        {children}
      </Stack>
    </Box>
  );
}
