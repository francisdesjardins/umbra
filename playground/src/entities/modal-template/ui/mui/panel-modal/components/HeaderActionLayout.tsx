import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { Box, Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type HeaderActionLayoutProps = {
  /**
   * Left slot — grows to fill available space, and keeps a floor of 10rem so a wide `actions`
   * side cannot starve it. `Shared.OverflownTypography` placed here truncates cleanly beyond
   * that floor.
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
/**
 * The row wraps, and the content side has a floor.
 *
 * With `flexShrink: 0` on the actions and `minWidth: 0` on the content, the content is the only
 * thing that can give — so it gives all of it. Measured on a 375px phone: a header with a badge,
 * a step select and a close button left the title 99px of 345 and rendered it as “Project De…”,
 * which is not a title. A floor plus a wrapping row means the actions drop to a second line
 * before that happens, and nothing has to know it is on a phone.
 */
export const HeaderActionLayout = ({ content, actions, sx }: HeaderActionLayoutProps) => {
  return (
    <Stack direction="row" sx={mergeSx({ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }, sx)}>
      <Box sx={{ flex: 1, minWidth: '10rem' }}>{content}</Box>
      {actions !== undefined && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexShrink: 0, ml: 'auto', pl: 2, alignItems: 'center' }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
};
