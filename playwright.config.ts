import { defineConfig, devices } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';
import { ctCoverage } from './scripts/vite-plugin-ct-coverage.mjs';

/**
 * Component-test coverage, opt-in through `CT_COVERAGE=1`.
 *
 * The unit project measures itself with c8 (V8 coverage of a Node process). A component test has
 * no Node process to measure — the code under test runs in the browser, in a bundle Vite built —
 * so the source is instrumented on the way in instead, and each test reads the counters back out
 * of its own page. Off by default: instrumentation is a real cost on every CT run, and the
 * numbers are only wanted when someone is asking about them.
 *
 * Read once: the flag decides four things below, and four independent reads of an environment
 * variable is four chances for them to answer differently.
 */
const withCoverage = process.env['CT_COVERAGE'] === '1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call -- a .mjs plugin, untyped by design; the Vite plugin shape is widened below anyway
const coveragePlugins: any[] = withCoverage ? [ctCoverage()] : [];

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- widened above, same reason
  ...coveragePlugins,
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
  // Empties `.nyc_output/` before any worker writes to it, and only when coverage is on — see the
  // file for why stale counters are worse than missing ones.
  globalSetup: './scripts/ct-coverage-reset.mjs',
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
    // One cache per bundle *shape*, and it is not a nicety. Playwright keys its CT build on the
    // Playwright and Vite versions and a hash of the sources — not on the plugin list — so
    // toggling CT_COVERAGE alone leaves the previous bundle in place: coverage runs produce no
    // counters at all, and the report says `.nyc_output` is empty rather than that anything is
    // wrong. Two directories means each build is valid on its own terms and switching costs one
    // rebuild instead of a wrong answer.
    //
    // One edge survives, because Playwright's freshness check walks the *component sources*: an
    // edit to `scripts/vite-plugin-ct-coverage.mjs` alone does not invalidate anything, so
    // changing the instrumenter means deleting `playwright/.cache-coverage/` by hand.
    ctCacheDir: withCoverage ? 'playwright/.cache-coverage' : 'playwright/.cache',
    ctViteConfig: {
      // Keep pre-bundled deps in a dedicated dir separate from the dev-server cache.
      // CI pipelines can cache node_modules/.vite-ct between runs for faster startup.
      cacheDir: withCoverage ? 'node_modules/.vite-ct-coverage' : 'node_modules/.vite-ct',
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
