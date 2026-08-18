import { mergeSx } from '@/entities/modal-template/ui/mui/shared/sxUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';

export type HeaderActionLayoutProps = {
  /** Left slot — grows, with a 10rem floor so a wide `actions` side cannot starve it. */
  readonly content: ReactNode;
  /** Right slot — never shrinks (`flexShrink: 0`). Icon buttons, actions, step indicators. */
  readonly actions?: ReactNode | undefined;
  readonly sx?: SxProps | undefined;
};

/**
 * Composable header row: `content` left, `actions` right, wrapping when they no longer fit.
 *
 * The row wraps and the content keeps a 10rem floor because with `flexShrink: 0` on the actions
 * the content is the only thing that can give, so it gives all of it — measured on a 375px phone,
 * a badge plus a step select plus a close button left the title 99px of 345 (“Project De…”). The
 * floor drops the actions to a second line instead, with nothing needing to know it is a phone.
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
