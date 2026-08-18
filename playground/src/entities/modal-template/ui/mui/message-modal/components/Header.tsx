import Stack from '@mui/material/Stack';
import { type SxProps } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/mui/shared/sxUtils';

export type HeaderProps = {
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Header = ({ children, sx }: HeaderProps) => {
  return (
    <Stack
      direction="row"
      sx={mergeSx({ flexShrink: 0, alignItems: 'center', justifyContent: 'space-between' }, sx)}
    >
      {children}
    </Stack>
  );
};
