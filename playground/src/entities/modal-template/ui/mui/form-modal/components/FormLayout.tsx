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
           * Drawn inside the box, not on its edge.
           *
           * A `<dialog>` keeps the UA's `fit-content` and is centred with `margin: auto`, so its
           * box lands on a fraction of a pixel — measured here at `top 300.734, bottom 599.25`,
           * with this element sharing that rectangle exactly. A 1px `border` then occupies the
           * last fractional pixel and the compositor keeps whatever share of it it likes: the
           * bottom edge came out missing while the sides were fine. An inset shadow is painted
           * inside the border box, so it lands on whole pixels regardless of where the box does.
           *
           * The trap and its remedies are written up in `src/CLAUDE.md`; this is "move the
           * border inward", and the templates are the right place to demonstrate it.
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
