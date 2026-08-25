import { colors } from '@/entities/dialog-template/ui/shared/tokens';
import { useMediaQuery } from '@/shared/lib/use-media-query';
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { ThemeContext } from '@/shared/lib/theme-context';

type Mode = 'light' | 'dark';

/** Also spelled out in `index.html`'s inline script, which runs before any module can be imported
 * and so cannot share this constant. Change both. */
const STORAGE_KEY = 'umbra:color-scheme';

/** A locked-down browser throws on `localStorage` rather than answering null, so both doors are
 * guarded and an unreadable preference is simply no preference. */
const readStoredMode = (): Mode | null => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
};

const writeStoredMode = (mode: Mode): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // A preference that cannot be stored is not worth failing the click over.
    return;
  }
};

/**
 * Everything keyed on the mode, in one place so the module-level seed and the effect cannot
 * disagree. `data-color-scheme` is what the app tokens and the vanilla CSS modules read;
 * `color-scheme` rides along because CSS cannot reach what the UA paints on its own — a native
 * `<select>` popup most visibly. The dialog surface vars sit on `:root` because dialogs inherit
 * custom properties through the DOM, top layer included.
 */
const applyMode = (mode: Mode): void => {
  const root = document.documentElement;
  root.setAttribute('data-color-scheme', mode);
  root.style.colorScheme = mode;
  const bg = mode === 'dark' ? colors.dialogBgDark : colors.dialogBgLight;
  root.style.setProperty('--dialog-bg', bg);
  root.style.setProperty('--slide-bg', bg);
  root.style.setProperty('--form-bg', bg);
};

// Before first paint, and before React renders: a stored preference that only lands in an effect
// shows the other scheme for a frame.
if (typeof document !== 'undefined') {
  applyMode(
    readStoredMode() ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

/**
 * The mode's single owner — and MUI-free: the shell styles itself from `app.css` tokens keyed on
 * the attribute below, and the one MUI theme left lives in `shared/ui/MuiIsland`, scoped to the
 * surfaces that demonstrate MUI.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  // Seeded from storage, so a reload keeps the choice. Null means no choice has been made and the
  // system query below stays live.
  const [userOverride, setUserOverride] = useState<Mode | null>(() => {
    return readStoredMode();
  });

  const mode = userOverride ?? (prefersDarkMode ? 'dark' : 'light');

  // Layout, not passive: the attribute has to land before the browser paints the new mode.
  useLayoutEffect(() => {
    applyMode(mode);
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
    const next: Mode = mode === 'light' ? 'dark' : 'light';
    setUserOverride(next);
    writeStoredMode(next);
  }, [mode]);

  return (
    <ThemeContext value={{ isDarkMode: mode === 'dark', toggleTheme }}>{children}</ThemeContext>
  );
};
