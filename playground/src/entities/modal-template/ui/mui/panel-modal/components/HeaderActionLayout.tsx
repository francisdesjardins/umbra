import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { Box, Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type HeaderActionLayoutProps = {
  /**
   * Left slot — grows to fill available space (`flex: 1, minWidth: 0`).
   * `Shared.OverflownTypography` placed here will truncate cleanly when
   * `actions` are large.
   */
  readonly content: ReactNode;
  /**
   * Right slot — never shrinks (`flexShrink: 0`). Place icon buttons,
   * action buttons, or step indicators here.
   */
  readonly actions?: ReactNode | undefined;
  readonly sx?: SxProps | undefined;
};

/**
 * Composable header row: `content` on the left, `actions` on the right.
 * The content side has `flex: 1, minWidth: 0` so that `OverflownTypography`
 * truncates correctly regardless of how wide the actions are.
 *
 * ```tsx
 * <PanelModal.PanelHeader>
 *   <PanelModal.HeaderActionLayout
 *     content={
 *       <Shared.OverflownTypography variant="h6" fontWeight={600}>
 *         {title}
 *       </Shared.OverflownTypography>
 *     }
 *     actions={
 *       <>
 *         <Button size="small">Save draft</Button>
 *         <IconButton onClick={() => handle.close('dismiss')}>
 *           <CloseIcon />
 *         </IconButton>
 *       </>
 *     }
 *   />
 * </PanelModal.PanelHeader>
 * ```
 */
export const HeaderActionLayout = ({ content, actions, sx }: HeaderActionLayoutProps) => {
  return (
    <Stack direction="row" sx={mergeSx({ alignItems: 'center' }, sx)}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{content}</Box>
      {actions !== undefined && (
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, ml: 2, alignItems: 'center' }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
};
