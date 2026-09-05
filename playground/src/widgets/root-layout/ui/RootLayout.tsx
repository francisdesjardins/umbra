import { PeekingMoon } from '@/shared/ui/PeekingMoon/PeekingMoon';
import { useCodeDialog } from '@/widgets/code-viewer';
import { useCodePane } from '@/shared/lib/code-pane-context';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { Sidebar } from '@/widgets/sidebar';
import { TopBar } from '@/widgets/top-bar';
import styles from '@/widgets/root-layout/ui/RootLayout.module.css';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const MainContent = () => {
  const codeDialog = useCodeDialog();
  const { setCodeDialogOpen } = useCodePane();

  // `open` keeps a stable identity, so it works as an effect dependency directly.
  const { open } = codeDialog;
  useEffect(() => {
    setCodeDialogOpen(() => {
      return () => {
        return open();
      };
    });
    return () => {
      setCodeDialogOpen(null);
    };
  }, [open, setCodeDialogOpen]);

  return (
    <main className={styles['main']}>
      <div className={styles['toolbarSpacer']} />
      <div className={styles['content']}>
        <Outlet />
      </div>
      {codeDialog.Dialog}
    </main>
  );
};

const ResponsiveShell = () => {
  // Below MUI's old `md` (900px) — spelled out, so the layout does not move without the theme.
  const isMobile = useMediaQuery('(max-width: 899.95px)');
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
    <div className={styles['shell']}>
      <TopBar isMobile={isMobile} onMenuClick={handleToggleSidebar} />
      <Sidebar isMobile={isMobile} mobileOpen={mobileOpen} onClose={handleCloseSidebar} />
      <MainContent />
    </div>
  );
};

export const RootLayout = () => {
  // Two reasons, one flag: `/` already shows the same moon still, so a hider beside a full-size
  // twin reads as a stray render; `/stories` opens panels at the card edges, where a mascot
  // reads as a fixture misbehaving.
  const hidesPeekingMoon = useRouterState({
    select: (state) => {
      return state.location.pathname === '/' || state.location.pathname === '/stories';
    },
  });

  // The shell and nothing above it: providers are `app/router.tsx`'s job, and a widget reaching up
  // for them inverts the layer order.
  return (
    <>
      <ResponsiveShell />
      {/* z-index 1200, below the 1300+ the manager assigns dialogs, so it never covers a panel. */}
      {!hidesPeekingMoon && <PeekingMoon />}
    </>
  );
};
