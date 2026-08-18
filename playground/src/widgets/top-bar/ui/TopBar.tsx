import { MoonPhase } from '@/shared/ui/MoonPhase';
import { ThemeToggleButton } from '@/shared/ui/ThemeToggleButton';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Link } from '@tanstack/react-router';

type TopBarProps = {
  readonly isMobile: boolean;
  readonly onMenuClick: () => void;
};

export const TopBar = ({ isMobile, onMenuClick }: TopBarProps) => {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => {
          return theme.zIndex.drawer + 1;
        },
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar sx={{ height: 64 }}>
        {isMobile && (
          <IconButton
            edge="start"
            onClick={onMenuClick}
            aria-label="Open navigation"
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {/* The brand is the way home — the landing page is the one route not in the sidebar. */}
        <Box
          component={Link}
          to="/"
          aria-label="Umbra — home"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            textDecoration: 'none',
            color: 'inherit',
            borderRadius: 1,
            '&:hover .umbra-wordmark': { color: 'accent.onSurface' },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* The umbra is the total-shadow core of an eclipse — what a modal backdrop casts. Same
                badge geometry as the sibling stardust playground, so the two read as a set. 20px is
                what `fontSize="small"` resolves to on the theme toggle beside it, and both badges are
                32px, so the two ends of the bar read as the same weight; a size, not a font size, so
                it holds in every font. */}
            <Box sx={{ color: 'primary.contrastText', display: 'flex' }}>
              <MoonPhase phase="first-quarter" size={20} />
            </Box>
          </Box>
          {/* Not an <h1>: the page's own title owns that, and two leave no unique document heading. */}
          <Typography
            className="umbra-wordmark"
            variant="h6"
            component="span"
            sx={{ fontWeight: 600, transition: 'color 120ms' }}
          >
            Umbra
          </Typography>
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 0.25,
              borderRadius: 0.5,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              fontWeight: 500,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Playground
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <ThemeToggleButton />
      </Toolbar>
    </AppBar>
  );
};
