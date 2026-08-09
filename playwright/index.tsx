import { beforeMount } from '@playwright/experimental-ct-react/hooks';
import { DialogManagerProvider } from '../src/react/dialog-manager-context.js';

/**
 * Global test wrapper applied to every Playwright CT mount.
 *
 * Wraps all components in a `DialogManagerProvider` so each test gets an
 * isolated dialog manager instance — modal registrations and state never
 * leak between tests.
 *
 * Extend this wrapper when additional providers are needed (e.g. theme,
 * router, or other context providers required by test harnesses).
 */
beforeMount(async ({ App }) => {
  return (
    <DialogManagerProvider>
      <App />
    </DialogManagerProvider>
  );
});
