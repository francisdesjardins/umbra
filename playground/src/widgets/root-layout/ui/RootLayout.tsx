import { PeekingMoon } from '@/shared/ui/PeekingMoon/PeekingMoon';
import { useCodeModal } from '@/widgets/code-viewer';
import { useCodePane } from '@/shared/lib/code-pane-context';
import { Sidebar } from '@/widgets/sidebar';
import { TopBar } from '@/widgets/top-bar';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const MainContent = () => {
  const codeModal = useCodeModal();
  const { setCodeModalOpen } = useCodePane();

  // `open` keeps a stable identity, so it works as an effect dependency directly.
  const { open } = codeModal;
  useEffect(() => {
    setCodeModalOpen(() => {
      return () => {
        return open();
      };
    });
    return () => {
      setCodeModalOpen(null);
    };
  }, [open, setCodeModalOpen]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        transition: 'margin-right 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        // A flex item's default `min-width: auto` is the content's minimum, so one unwrappable line
        // stretches this past the viewport; what cannot shrink scrolls in its own container instead.
        minWidth: 0,
      }}
    >
      <Toolbar sx={{ height: 64 }} />
      {/* No `overflow: auto`: the window does the scrolling, and declaring it would make this the
          nearest scrolling ancestor, silently killing `position: sticky` on every jump bar inside. */}
      <Box
        sx={{
          flex: 1,
          px: { xs: 2, md: 4 },
          py: { xs: 2, md: 4 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
        }}
      >
        <Outlet />
      </Box>
      {codeModal.Modal}
    </Box>
  );
};

const ResponsiveShell = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    setMobileOpen((prev) => {
      return !prev;
    });
  };

  const handleCloseSidebar = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <TopBar isMobile={isMobile} onMenuClick={handleToggleSidebar} />
      <Sidebar isMobile={isMobile} mobileOpen={mobileOpen} onClose={handleCloseSidebar} />
      <MainContent />
    </Box>
  );
};

export const RootLayout = () => {
  // Suppressed on the two routes already showing the same moon still, at 78% of its column: a
  // hider beside a full-size twin, arriving 1.5s late, reads as a stray render rather than a joke.
  const hasStillMoon = useRouterState({
    select: (state) => {
      return state.location.pathname === '/' || state.location.pathname === '/warzone';
    },
  });

  // The shell and nothing above it: providers are `app/router.tsx`'s job, and a widget reaching up
  // for them inverts the layer order.
  return (
    <>
      <ResponsiveShell />
      {/* z-index 1200, below the 1300+ the manager assigns dialogs, so it never covers a panel. */}
      {!hasStillMoon && <PeekingMoon />}
    </>
  );
};
