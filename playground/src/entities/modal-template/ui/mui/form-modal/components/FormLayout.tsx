import { Box, Stack, type SxProps } from '@mui/material';
import { type ComponentProps, type ReactNode } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type FormLayoutProps = {
  readonly children: ReactNode;
  /** Called on form submit. Defaults to `e.preventDefault()` if not provided. */
  readonly onSubmit?: ComponentProps<'form'>['onSubmit'] | undefined;
  readonly sx?: SxProps | undefined;
};

export const FormLayout = ({ children, onSubmit, sx }: FormLayoutProps) => {
  return (
    <Box
      sx={mergeSx(
        {
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'var(--modal-bg)',
          backgroundImage: 'none',
        },
        sx
      )}
    >
      <Stack
        spacing={2}
        component="form"
        onSubmit={
          onSubmit ??
          ((e) => {
            e.preventDefault();
          })
        }
      >
        {children}
      </Stack>
    </Box>
  );
};
