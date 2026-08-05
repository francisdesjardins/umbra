import { createAppTheme } from '@/app/providers/ThemeProvider/theme';
import { colors } from '@/entities/modal-template/ui/shared/tokens';
import { CssBaseline, ThemeProvider as MuiThemeProvider, useMediaQuery } from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from './ThemeContext';

// Seed the modal surface CSS vars on :root before first paint so dialogs (which inherit
// custom properties from :root through the DOM, top layer included) theme correctly on mount.
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

  // Apply data-mui-color-scheme attribute to document for vanilla CSS modules
  useEffect(() => {
    document.documentElement.setAttribute('data-mui-color-scheme', mode);
  }, [mode]);

  // Keep the modal surface CSS vars on :root in sync with the theme. Open dialogs pick up
  // the change automatically via custom-property inheritance from :root — no per-dialog
  // sync needed (the library no longer copies these vars onto the <dialog> inline style).
  useLayoutEffect(() => {
    const bg = mode === 'dark' ? colors.modalBgDark : colors.modalBgLight;
    document.documentElement.style.setProperty('--modal-bg', bg);
    document.documentElement.style.setProperty('--slide-bg', bg);
    document.documentElement.style.setProperty('--form-bg', bg);
  }, [mode]);

  // Theme the dialog backdrop based on current mode
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
