import { Box, Stack, type SxProps, type Theme } from '@mui/material';
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
          /**
           * The border drawn inside the box rather than on its edge — `src/CLAUDE.md`'s "move the
           * border inward". A `<dialog>` keeps the UA's `fit-content` and centres with
           * `margin: auto`, so its box lands on a fractional pixel (measured: top 300.734, bottom
           * 599.25, shared exactly by this element); a 1px `border` then occupies that last
           * fraction and the compositor keeps what it likes of it, which lost the bottom edge
           * while the sides were fine. An inset shadow paints inside the border box, on whole
           * pixels regardless.
           */
          boxShadow: (theme: Theme) => {
            return `inset 0 0 0 1px ${theme.palette.divider}`;
          },
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
