import { createAppTheme } from '@/app/providers/ThemeProvider/theme';
import { colors } from '@/entities/modal-template/ui/shared/tokens';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from '@/shared/lib/theme-context';

// Seed the modal surface vars on :root before first paint: dialogs inherit custom properties from
// :root through the DOM, top layer included, so they theme correctly on mount.
if (typeof document !== 'undefined') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialBg = prefersDark ? colors.modalBgDark : colors.modalBgLight;
  document.documentElement.style.setProperty('--modal-bg', initialBg);
  document.documentElement.style.setProperty('--slide-bg', initialBg);
  document.documentElement.style.setProperty('--form-bg', initialBg);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [userOverride, setUserOverride] = useState<'light' | 'dark' | null>(null);

  const mode = userOverride ?? (prefersDarkMode ? 'dark' : 'light');
  const theme = createAppTheme(mode);

  // `data-mui-color-scheme` on the document is what the vanilla CSS modules key off.
  // `color-scheme` rides along because CSS cannot reach what the UA paints on its own — the
  // popup of a native <select> most visibly: without it, dark mode served white option lists.
  useEffect(() => {
    document.documentElement.setAttribute('data-mui-color-scheme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  // Open dialogs pick these up through custom-property inheritance from :root, so no per-dialog sync.
  useLayoutEffect(() => {
    const bg = mode === 'dark' ? colors.modalBgDark : colors.modalBgLight;
    document.documentElement.style.setProperty('--modal-bg', bg);
    document.documentElement.style.setProperty('--slide-bg', bg);
    document.documentElement.style.setProperty('--form-bg', bg);
  }, [mode]);

  useEffect(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
      mode === 'dark'
        ? `dialog::backdrop { background-color: rgba(0, 0, 0, 0.7); }`
        : `dialog::backdrop { background-color: rgba(0, 0, 0, 0.35); }`
    );
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    return () => {
      document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => {
        return s !== sheet;
      });
    };
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setUserOverride((prev) => {
      const currentMode = prev ?? (prefersDarkMode ? 'dark' : 'light');
      return currentMode === 'light' ? 'dark' : 'light';
    });
  }, [prefersDarkMode]);

  return (
    <ThemeContext value={{ isDarkMode: mode === 'dark', toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext>
  );
};
