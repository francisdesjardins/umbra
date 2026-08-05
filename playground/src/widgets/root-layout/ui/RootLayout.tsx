import { CodePaneProvider } from '@/app/providers/CodePaneProvider/CodePaneProvider';
import { PeekingMoon } from '@/shared/ui/PeekingMoon/PeekingMoon';
import { ThemeProvider } from '@/app/providers/ThemeProvider/ThemeProvider';
import { useCodeModal } from '@/widgets/code-viewer/model/useCodeModal';
import { useCodePane } from '@/widgets/code-viewer/model/useCodePane';
import { Sidebar } from '@/widgets/sidebar/ui/Sidebar';
import { TopBar } from '@/widgets/top-bar/ui/TopBar';
import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material';
import { Outlet } from '@tanstack/react-router';
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
  return (
    <ThemeProvider>
      <CodePaneProvider>
        <ResponsiveShell />
        {/* Sits at z-index 1200, below the 1300+ the manager assigns dialogs, so the mascot
            never covers a panel it is meant to be charming next to. */}
        <PeekingMoon />
      </CodePaneProvider>
    </ThemeProvider>
  );
};
