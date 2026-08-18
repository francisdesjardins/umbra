import { useSyncExternalStore } from 'react';

/**
 * `window.matchMedia` as a subscription — the shell's own, MUI-free. The breakpoint values the
 * layout uses are MUI's defaults spelled out (`sm` 600, `md` 900), because the rendered layout
 * must not move when the theme object goes.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => {
      return window.matchMedia(query).matches;
    }
  );
}
