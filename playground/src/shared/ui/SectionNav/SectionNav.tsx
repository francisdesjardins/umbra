import { Box, Chip } from '@mui/material';
import { Link, useRouterState } from '@tanstack/react-router';

type SectionNavProps = {
  /** Section labels in page order. Each must match an `ExampleSection` title on the page. */
  readonly sections: readonly { readonly id: string; readonly label: string }[];
};

/**
 * Sticky jump bar for long pages.
 *
 * Pages like Test Stories run to sixty-odd cards; without this the only way to reach a group
 * is to scroll past every group before it.
 *
 * The chips navigate through the router rather than carrying a bare `href="#id"`, because that
 * anchor cannot express a section under the hash-router build (`yarn playground:build:file`,
 * which is what ships to a static host). There, the whole URL after `#` is the *route* — so a
 * plain `#stacking` replaces `#/advanced` instead of adding to it, and the click lands on the
 * index page rather than scrolling. Handing the router both halves lets it emit `#/advanced`
 * plus its own `#stacking` and scroll to it, which is why every link in the API reference is a
 * `Link` too. Deep links still survive a reload and are still shareable, in both builds.
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
        /**
         * A two-pixel bleed of *background only*, which is a subpixel fix and nothing more.
         *
         * A highlighted card and this bar are both the content column's width, so the card's 1px
         * border should pass exactly behind it. They do not land on the same pixel: the column's
         * width is fractional, so the card's border straddles the bar's edge and roughly half of
         * it stays lit — an orange hairline down each side of the bar, moving as the page scrolls.
         *
         * It has to be the background that widens and not the box. Widening the box (negative
         * margins with matching padding) takes the `borderBottom` with it, and the divider then
         * runs past the cards it is supposed to sit above — which is far more visible than the
         * hairline it fixes. Hence a pseudo-element behind: the bar's own edges, border included,
         * do not move at all.
         */
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
