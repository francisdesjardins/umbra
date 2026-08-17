import { createContext, use } from 'react';

/**
 * The theme, as a context every layer may read. It lives in `shared` because of who consumes it,
 * not who provides it: the provider is `app`'s, but `ThemeToggleButton` is `shared/ui` and the
 * microfrontend frame is a page, and Feature-Sliced Design imports run downward only.
 */
export type ThemeContextValue = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
