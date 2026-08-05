import { Stack, Typography, type SxProps } from '@mui/material';
import type { ReactNode } from 'react';

export type SectionProps = {
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly sx?: SxProps | undefined;
};

export const Section = ({ title, children, sx }: SectionProps) => {
  return (
    <Stack spacing={1} sx={sx}>
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {title}
      </Typography>
      {children}
    </Stack>
  );
};
