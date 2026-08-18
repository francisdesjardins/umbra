import Box from '@mui/material/Box';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelHeaderSlotProps = {
  /** Overrides for the inner content box that wraps children (controls padding etc.). */
  readonly content?: { readonly sx?: SxProps | undefined } | undefined;
};

export type PanelHeaderProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  readonly slotProps?: PanelHeaderSlotProps | undefined;
};

/**
 * Header shell for big/complex modals — padding only; compose a `<Divider />` after it for visual
 * separation, and a `HeaderActionLayout` inside it. See `PanelContainer` for the full composition.
 */
export const PanelHeader = ({ children, sx, slotProps }: PanelHeaderProps) => {
  return (
    <Box sx={mergeSx({ flexShrink: 0 }, sx)}>
      <Box sx={mergeSx({ px: 2.5, py: 2 }, slotProps?.content?.sx)}>{children}</Box>
    </Box>
  );
};
