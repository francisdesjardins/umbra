import { Box, type SxProps } from '@mui/material';
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
 * Header shell for big/complex modals. Manages padding only — compose a
 * `<Divider />` after it in the parent for visual separation.
 *
 * ```tsx
 * <PanelModal.PanelContainer>
 *   <PanelModal.PanelHeader>
 *     <PanelModal.HeaderActionLayout content={…} actions={…} />
 *   </PanelModal.PanelHeader>
 *   <Divider />
 *   <PanelModal.PanelContent>…</PanelModal.PanelContent>
 *   <Divider />
 *   <PanelModal.PanelFooter>…</PanelModal.PanelFooter>
 * </PanelModal.PanelContainer>
 * ```
 */
export const PanelHeader = ({ children, sx, slotProps }: PanelHeaderProps) => {
  return (
    <Box sx={mergeSx({ flexShrink: 0 }, sx)}>
      <Box sx={mergeSx({ px: 2.5, py: 2 }, slotProps?.content?.sx)}>{children}</Box>
    </Box>
  );
};
