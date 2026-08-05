import { defineConfig, devices } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';

// @playwright/experimental-ct-core bundles its own Vite version whose Plugin
// type diverges from the project's Vite 8 beta. The plugin is runtime-compatible;
// only the TypeScript signatures differ, so we widen the type here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vitePlugins: any[] = [
  react({
    babel: {
      plugins: [['babel-plugin-react-compiler', { target: '19' }]],
    },
  }),
];

/**
 * Unified Playwright configuration for both unit and component tests.
 *
 * Projects:
 *   unit      — *.test.ts files, pure utility tests, no browser launched
 *   component — *.ct.tsx files, React component tests via Playwright CT (Chromium)
 *
 * VS Code test explorer discovers all tests from this single config.
 * Run subsets with --project=unit or --project=component.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  snapshotDir: './__snapshots__',
  timeout: 10 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      // Keep pre-bundled deps in a dedicated dir separate from the dev-server cache.
      // CI pipelines can cache node_modules/.vite-ct between runs for faster startup.
      cacheDir: 'node_modules/.vite-ct',
      optimizeDeps: {
        // Explicitly pre-bundle React so it is processed once and cached rather
        // than re-transformed on every cold start.
        include: ['react', 'react-dom'],
      },
      plugins: vitePlugins,
    },
  },
  projects: [
    {
      name: 'unit',
      // Rooted at the repo, not `src`: the playground has helpers of its own — a fuzzy
      // matcher, a slug — and a helper's claim on a test does not depend on which workspace
      // it ships from.
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.test.ts'],
    },
    {
      name: 'component',
      // Rooted at the repo for the same reason as `unit`: a harness is a harness wherever it
      // ships, and the patterns the playground owns (a store scoped to a subtree, a selector
      // hook) have component tests of their own. Left at the default `./src`, moving one of
      // those out of the library silently stops running it.
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
