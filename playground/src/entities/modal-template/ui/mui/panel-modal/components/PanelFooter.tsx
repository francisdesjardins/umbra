import { Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type PanelFooterProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
  /**
   * Controls alignment of footer actions.
   * - `'end'` (default) — buttons aligned to the right.
   * - `'space-between'` — useful for wizard back/next patterns.
   * - `'start'` — left-aligned.
   */
  readonly justify?: 'start' | 'end' | 'space-between' | undefined;
};

/**
 * Footer for big/complex modals. Manages padding and action alignment only —
 * compose a `<Divider />` before it in the parent for visual separation.
 *
 * ```tsx
 * <PanelModal.PanelContainer>
 *   <PanelModal.PanelHeader>…</PanelModal.PanelHeader>
 *   <Divider />
 *   <PanelModal.PanelContent>…</PanelModal.PanelContent>
 *   <Divider />
 *   <PanelModal.PanelFooter>…</PanelModal.PanelFooter>
 * </PanelModal.PanelContainer>
 * ```
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
