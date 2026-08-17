import { Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelFooterProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /** Action alignment: `'end'` (default), `'start'`, or `'space-between'` for wizard back/next. */
  readonly justify?: 'start' | 'end' | 'space-between' | undefined;
};

/**
 * Footer for big/complex modals — padding and action alignment only; compose a `<Divider />`
 * before it for visual separation. See `PanelContainer` for the full composition.
 */
export const PanelFooter = ({ children, sx, justify = 'end' }: PanelFooterProps) => {
  const justifyContent =
    justify === 'start' ? 'flex-start' : justify === 'space-between' ? 'space-between' : 'flex-end';

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={mergeSx({ flexShrink: 0, justifyContent, alignItems: 'center', px: 2.5, py: 2 }, sx)}
    >
      {children}
    </Stack>
  );
};
