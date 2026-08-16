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

  // `open` keeps a stable identity for the life of the hook, so it can be used as
  // an effect dependency directly — no ref indirection needed.
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
        // A flex item defaults to `min-width: auto`, which is the *content's* minimum — so one
        // unwrappable thing inside (a code block's longest line) stretches this box past the
        // viewport and the whole page scrolls sideways on a phone. Every page's content must be
        // free to shrink; what cannot shrink scrolls inside its own container instead.
        minWidth: 0,
      }}
    >
      <Toolbar sx={{ height: 64 }} />
      {/* No `overflow: auto` here. The box never actually scrolls (it grows with its content
          and the window does the scrolling), but declaring it makes this box the nearest
          scrolling ancestor — which silently disables `position: sticky` for everything
          inside, including each page's section jump bar. */}
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
  // Everywhere but the two routes that already show the same moon standing still, at 78% of its
  // column. The joke is that one is *hiding*, and a hider needs to be the only one of its kind
  // on screen — beside a full-size twin it reads as a stray second render, and worse, it arrives
  // a second and a half after the page settles, which reads as a bug rather than a visit.
  const hasStillMoon = useRouterState({
    select: (state) => {
      return state.location.pathname === '/' || state.location.pathname === '/warzone';
    },
  });

  // The providers that used to wrap this are composed in `app/router.tsx` now — deciding what
  // surrounds the application is `app`'s job, and a widget reaching up into it for two of them
  // was the layer order inverted. This renders the shell and nothing above it.
  return (
    <>
      <ResponsiveShell />
      {/* Sits at z-index 1200, below the 1300+ the manager assigns dialogs, so the mascot
          never covers a panel it is meant to be charming next to. */}
      {!hasStillMoon && <PeekingMoon />}
    </>
  );
};
