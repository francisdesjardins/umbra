import { styled } from '@mui/material/styles';
import { Link } from '@tanstack/react-router';

/**
 * A TanStack `Link` that takes MUI's `sx`.
 *
 * Every navigation in the reference goes through this: MUI's `component={Link}` escape hatch
 * cannot type a link to a dynamic route, and wrapping `Link` in `styled` erases the router
 * generics that would type `params`. So links are built as plain paths instead — through
 * `categoryHref` and `symbolHref`, which are the only two places a reference URL is spelled.
 */
export const RouterLink = styled(Link)({
  textDecoration: 'none',
  color: 'inherit',
});
