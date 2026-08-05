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
