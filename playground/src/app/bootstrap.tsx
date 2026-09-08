import { RouterProvider } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { router } from '@/app/router';

/**
 * Render the demo.
 *
 * Its own module so `main.tsx` can reach it with a dynamic import: the component suite's `?gallery`
 * door must not pull the router in, and a static import at the top of `main.tsx` loads the whole
 * app graph whether or not the branch below it runs — `ThemeProvider` among it, whose module-level
 * side effect writes `--form-bg` inline on `:root` and outranks the stylesheet rule a template's
 * dark mode keys on.
 */
export function bootstrap(): void {
  const rootElement = document.getElementById('app');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}
