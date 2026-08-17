import { defineConfig, devices } from '@playwright/experimental-ct-react';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { ctCoverage } from './scripts/vite-plugin-ct-coverage.mjs';
import { reactCompiler } from './scripts/vite-plugin-react-compiler.mjs';

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
  react(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- widened above, same reason
  ...coveragePlugins,
  // After coverage, deliberately: both are `enforce: 'pre'`, so this array is the order, and the
  // instrumenter needs the file as written for its counters to land without a source map.
  //
  // The compiler is applied here rather than through a plugin option because neither wiring that
  // looks right actually works: `react({ babel: … })` is the pre-rolldown form and silently
  // transforms nothing, and `@rolldown/plugin-babel` — which the library build uses — has no
  // effect inside the Vite that Playwright's component runner bundles. A suite that exercises
  // uncompiled source while the package ships compiled output is not testing the package.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- a .mjs plugin, untyped like the one above
  reactCompiler({ target: '19' }),
];

/**
 * What one component test may take, and it is a **contention** budget rather than a behaviour one.
 *
 * A browser test locally shares the machine with `cpus/2` siblings, and Playwright's actionability
 * wait — visible, enabled, stable — is wall-clock: a page that would settle in 400ms alone can miss
 * a 10s deadline when eight workers are compiling and painting at once, and the failure arrives as a
 * timeout on an ordinary click rather than as a wrong answer. Measured on `use-modal.ct.tsx`
 * ×15 on WebKit — 1245 tests: **1 red at 10s, 0 red at 30s, and no slower** (2.6 min against 2.8),
 * because the budget is a ceiling and green runs never touch it.
 *
 * A ceiling is not the lever `retries` is, and `retries` stay at 0 locally on purpose: a retry takes
 * the second answer from a test that gave a wrong first one, where a ceiling only keeps a correct run
 * from being cut off. 30s is Playwright's own default, and a component test that reaches it is hung.
 */
const COMPONENT_TIMEOUT = 30 * 1000;

/**
 * Unified Playwright configuration for both unit and component tests.
 *
 * Projects:
 *   unit               — *.test.ts, pure logic, no browser launched
 *   component          — *.ct.tsx via Playwright CT, on Chromium
 *   component-firefox  — the same, on Gecko
 *   component-webkit   — the same, on WebKit
 *
 * VS Code test explorer discovers all tests from this single config.
 * Run subsets with --project=unit, or `yarn test:component:{chromium,firefox,webkit}`.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  // Empties `.nyc_output/` before any worker writes to it, and only when coverage is on — see the
  // file for why stale counters are worse than missing ones.
  globalSetup: './scripts/ct-coverage-reset.mjs',
  snapshotDir: './__snapshots__',
  // The unit project's budget: pure logic, so 10s is already three orders of magnitude of slack and
  // a test that reaches it is hung rather than slow. The three component projects raise it — see the
  // `timeout` on each, which is where the reason lives.
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
      // The playground's harnesses reach the library the way a user does — `umbra/react`, per
      // its own rule against deep relative climbs into `src/` — and this build is the only one
      // that has to resolve that without the playground's Vite config. There is no
      // `node_modules/umbra`: the root workspace is not linked under its own name, and
      // `import.meta.resolve('umbra/react')` from `playground/` answers ERR_MODULE_NOT_FOUND.
      // It resolved anyway, through Vite's own lookup, and a green suite resting on that is a
      // green suite one resolver change from disappearing — it went red here once already and a
      // `yarn install` put it back with nothing to point at. Stated now, matching the alias
      // `playground/vite.config.ts` has always had.
      resolve: {
        alias: { umbra: resolve(import.meta.dirname, 'src') },
      },
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
      timeout: COMPONENT_TIMEOUT,
    },
    // Gecko and WebKit run the same harnesses as Chromium. The declared floor names Firefox 115
    // and Safari 16.4, and a support claim nothing exercises is a guess with a version number on
    // it. Three engines cost about a minute on the full suite, and one of them earned its place
    // immediately.
    {
      name: 'component-firefox',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Firefox'] },
      timeout: COMPONENT_TIMEOUT,
    },
    // WebKit, which is the engine that found the focus bug rather than merely tripping over it —
    // see `captureActionRunner`. It is in the default list because it passes, and because the
    // declared floor names Safari 16.4: the whole argument for running Gecko applies here twice
    // over, since this is the one engine whose behaviour differs enough to catch something.
    {
      name: 'component-webkit',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Safari'] },
      timeout: COMPONENT_TIMEOUT,
    },
  ],
});
