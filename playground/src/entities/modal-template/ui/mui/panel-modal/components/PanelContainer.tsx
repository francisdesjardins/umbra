import Box from '@mui/material/Box';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelContainerProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

/**
 * Full-size container for big/complex modals (wizards, large forms, tables): a flex-column frame
 * with a border and background, leaving dividers and spacing to the caller.
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
