import { createContext, use } from 'react';

/**
 * The theme, as a context every layer may read.
 *
 * **It lives in `shared` because of who consumes it, not who provides it.** The provider is
 * `app`'s — it owns the MUI theme object and the persistence — but `ThemeToggleButton` is a
 * `shared/ui` component and the microfrontend frame is a page, and under Feature-Sliced Design
 * imports run downward only: neither may reach up into `app`. Keeping the *contract* here and the
 * *implementation* there is what lets both read it without inverting the layer order.
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
