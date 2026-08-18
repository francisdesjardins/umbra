import { createAppTheme } from '@/shared/lib/mui-theme';
import { useTheme } from '@/shared/lib/theme-context';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';

/**
 * The one place MUI still gets a theme: around the surfaces that *demonstrate* MUI integration.
 * The app shell runs on its own CSS, so a global provider would be a theme for nobody — and
 * keeping the provider here is what lets everything else render without the vendor chunk's help.
 */
export const MuiIsland = ({ children }: { readonly children: ReactNode }) => {
  const { isDarkMode } = useTheme();
  return (
    <MuiThemeProvider theme={createAppTheme(isDarkMode ? 'dark' : 'light')}>
      {children}
    </MuiThemeProvider>
  );
};
