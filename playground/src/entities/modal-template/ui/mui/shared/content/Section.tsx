import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { type SxProps } from '@mui/material/styles';
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
