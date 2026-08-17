import { Box, Chip } from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';

type SectionNavProps = {
  /** Section labels in page order. Each must match an `ExampleSection` title on the page. */
  readonly sections: readonly { readonly id: string; readonly label: string }[];
};

/**
 * Sticky jump bar for long pages — Test Stories runs to sixty-odd cards. The chips navigate through
 * the router rather than a bare `href="#id"`: under the hash-router build
 * (`yarn playground:build:file`, what ships to a static host) everything after `#` is the *route*,
 * so `#stacking` would replace `#/advanced` and land on the index page. Given both halves the
 * router emits `#/advanced` plus `#stacking` and scrolls — so API-reference links are `Link`s too.
 */
export const SectionNav = ({ sections }: SectionNavProps) => {
  const pathname = useRouterState({
    select: (state) => {
      return state.location.pathname;
    },
  });

  return (
    <Box
      component="nav"
      aria-label="Jump to section"
      sx={{
        position: 'sticky',
        top: 64,
        zIndex: 2,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.75,
        py: 1.5,
        mb: 3,
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
        // A two-pixel bleed of *background only*: the column's width is fractional, so a card's 1px
        // border straddles this bar's edge and stays half-lit as an orange hairline. The background
        // widens, not the box — negative margins would take `borderBottom` past the cards.
        '&::before': {
          content: '""',
          position: 'absolute',
          insetBlock: 0,
          left: -2,
          right: -2,
          bgcolor: 'background.default',
          zIndex: -1,
        },
      }}
    >
      {sections.map((section) => {
        return (
          <Chip
            key={section.id}
            component={Link}
            to={pathname}
            hash={section.id}
            label={section.label}
            size="small"
            variant="outlined"
            clickable
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          />
        );
      })}
    </Box>
  );
};
