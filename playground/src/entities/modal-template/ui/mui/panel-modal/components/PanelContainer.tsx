import { Box, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelContainerProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

/**
 * Full-size container for big/complex modals (wizards, large forms, tables).
 * A plain flex-column frame — border, background, and nothing else. All
 * internal layout (dividers, spacing) is composed explicitly by the caller:
 *
 * ```tsx
 * <PanelModal.PanelContainer sx={{ width: 600 }}>
 *   <PanelModal.PanelHeader>…</PanelModal.PanelHeader>
 *   <Divider />
 *   <PanelModal.PanelContent>…</PanelModal.PanelContent>
 *   <Divider />
 *   <PanelModal.PanelFooter>…</PanelModal.PanelFooter>
 * </PanelModal.PanelContainer>
 * ```
 */
export const PanelContainer = ({ children, sx }: PanelContainerProps) => {
  return (
    <Box
      sx={mergeSx(
        {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          width: '100%',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'var(--modal-bg)',
          backgroundImage: 'none',
          overflow: 'visible',
        },
        sx
      )}
    >
      {children}
    </Box>
  );
};
