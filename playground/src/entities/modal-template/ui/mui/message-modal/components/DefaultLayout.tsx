import { Stack, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';
import { focusRingRoom, spacing } from '@/entities/modal-template/ui/shared/tokens';
import { DefaultContainer } from '@/entities/modal-template/ui/mui/message-modal/components/DefaultContainer';

export type DefaultLayoutProps = {
  readonly children: ReactNode;
  readonly slotProps?:
    | {
        readonly container?: { readonly sx?: SxProps | undefined } | undefined;
        readonly stack?: { readonly sx?: SxProps | undefined } | undefined;
      }
    | undefined;
};

export const DefaultLayout = ({ children, slotProps }: DefaultLayoutProps) => {
  return (
    <DefaultContainer sx={slotProps?.container?.sx}>
      <Stack
        sx={mergeSx(
          {
            gap: spacing.gapUnit,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            maxHeight: '100%',
            // Bounds the layout so `Content` scrolls rather than the box growing; it clips at this
            // padding box, hence the reserved focus-ring room below.
            overflow: 'hidden',
            // Grown outward into the container's own 24px padding, so nothing on screen moves.
            ...focusRingRoom,
          },
          slotProps?.stack?.sx
        )}
      >
        {children}
      </Stack>
    </DefaultContainer>
  );
};
