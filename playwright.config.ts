import { defineConfig, devices } from '@playwright/test';

/**
 * Where the component suite mounts, and it is the playground's own dev server.
 *
 * The suite has no bundler of its own any more: `/stories` exposes `window.mount` over the same
 * harnesses it shows a reader, built by the playground's Vite — which already applies the React
 * Compiler at `target: '19'` and the `umbra` alias, so the bundle a test exercises is the one the
 * demo runs rather than a second pipeline configured to match.
 */
const withCoverage = process.env['CT_COVERAGE'] === '1';

/**
 * A coverage run gets its **own** server, on its own port.
 *
 * The instrumenter is a plugin in the playground's Vite, switched on by `CT_COVERAGE=1` — so a dev
 * server already up on 3000 was started without it, and reusing that one produces a report with no
 * counters in it at all rather than a low number. That is the quiet failure
 * `scripts/ct-coverage-report.mjs` exists to name, and this is the arrangement that stops it: a
 * separate port, never reused, so the two servers cannot be mistaken for each other.
 */
const PORT = withCoverage ? 3101 : 3000;
const GALLERY_URL = `http://localhost:${String(PORT)}/stories?gallery=1`;

/**
 * What one component test may take, and it is a **contention** budget rather than a behaviour one.
 *
 * A browser test locally shares the machine with `cpus/2` siblings, and Playwright's actionability
 * wait — visible, enabled, stable — is wall-clock: a page that would settle in 400ms alone can miss
 * a 10s deadline when eight workers are compiling and painting at once, and the failure arrives as a
 * timeout on an ordinary click rather than as a wrong answer. Measured on `use-dialog.ct.tsx`
 * ×15 on WebKit — 1245 tests: **1 red at 10s, 0 red at 30s, and no slower** (2.6 min against 2.8),
 * because the budget is a ceiling and green runs never touch it.
 *
 * A ceiling is not the lever `retries` is, and `retries` stay at 0 locally on purpose: a retry takes
 * the second answer from a test that gave a wrong first one, where a ceiling only keeps a correct run
 * from being cut off. 30s is Playwright's own default, and a component test that reaches it is hung.
 */
const COMPONENT_TIMEOUT = 30 * 1000;

/**
 * Tests the parallel runner cannot host, kept out of the default run rather than made tolerant.
 *
 * A browser dispatches `blur` and `focusout` only while the document holds the focus — without it
 * `activeElement` still moves, silently. A test of anything built on those events therefore measures
 * which page the runner happened to front, and under `cpus/2` workers that is a coin toss.
 * `yarn test:component:focus` runs them on one worker, where the answer means something.
 */
const NEEDS_REAL_FOCUS = /@focus-dependent/;

/**
 * Tests that need a touchscreen, which is a **device** rather than an engine.
 *
 * The dismissal paths are pointer-driven, and a finger is not a small mouse: a press that becomes a
 * scroll ends in `pointercancel` with no `pointerup` at all, and the compatibility mouse events a
 * tap synthesises arrive after it. Neither shape occurs on the desktop projects, so nothing there
 * measures them.
 */
const NEEDS_TOUCH = /@touch/;

/**
 * The touch cases only Chromium can be made to drive: Playwright's touchscreen taps and nothing
 * else, so a *moving* finger needs `Input.dispatchTouchEvent` over CDP, which WebKit has no
 * equivalent of. Excluded there rather than skipped inside a test, so the reason lives in one
 * place and the run says plainly what it covered.
 */
const NEEDS_TOUCH_CDP = /@touch-cdp/;

/** What a desktop mouse cannot drive: the focus-serialised set, and the touch set. */
const NOT_A_DESKTOP_MOUSE = /@focus-dependent|@touch/;

/**
 * Unified Playwright configuration for both unit and component tests.
 *
 * Projects:
 *   unit               — *.test.ts, pure logic, no browser launched
 *   component          — *.ct.tsx via Playwright CT, on Chromium
 *   component-firefox  — the same, on Gecko
 *   component-webkit   — the same, on WebKit
 *   component-touch    — the `@touch` subset, Chromium with a touchscreen
 *   component-touch-webkit — the same subset on WebKit, less the CDP-only cases
 *
 * VS Code test explorer discovers all tests from this single config.
 * Run subsets with --project=unit, or `yarn test:component:{chromium,firefox,webkit}`.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src',
  // The projects below root at the repo, and `testMatch` is unanchored — so `src/**` also matches
  // `.claude/worktrees/<branch>/src/**`, and a worktree Claude Code left behind is discovered as a
  // second copy of the suite. It carries its own `node_modules`, so loading one file from it throws
  // `Requiring @playwright/test second time` and takes the whole run down, in a repo where nothing
  // is wrong.
  testIgnore: ['**/.claude/**', '**/node_modules/**'],
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
    baseURL: GALLERY_URL,
    // A cached response shadowing a fresh bundle is the one failure mode that reads as a flaky
    // test rather than a stale page, and the playground registers no worker of its own to lose.
    serviceWorkers: 'block',
    // **Not `reuseContext`**, which the migration guide suggests for speed. The manager is a
    // module singleton, so a shared context carries one test's registrations into the next: the
    // provider-isolation and DOM-event harnesses went red on their *second* interaction, which is
    // exactly what a leaked registry looks like. A context per test is the isolation this suite
    // has always had, and it costs about a second across the whole project.
  },
  // Reused when one is already up — the dev server on :3000 is usually the one being worked in.
  // Never for coverage: see `PORT`.
  webServer: {
    command: withCoverage ? `yarn dev --port ${String(PORT)} --strictPort` : 'yarn dev',
    url: GALLERY_URL,
    reuseExistingServer: !process.env.CI && !withCoverage,
    timeout: 120 * 1000,
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
      grepInvert: NOT_A_DESKTOP_MOUSE,
    },
    // Gecko and WebKit run the same harnesses as Chromium. The declared floor names Firefox 115
    // and Safari 16.4, and a support claim nothing exercises is a guess with a version number on
    // it. Three engines cost about a minute on the full suite, and one of them earned its place
    // immediately.
    // The excluded ones, on their own terms: one worker, so the page it drives is the one holding the
    // browser's focus. `grepInvert` above is per project, so this needs its own rather than a flag.
    {
      name: 'component-focus',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Chrome'] },
      timeout: COMPONENT_TIMEOUT,
      grep: NEEDS_REAL_FOCUS,
    },
    {
      name: 'component-firefox',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Firefox'] },
      timeout: COMPONENT_TIMEOUT,
      grepInvert: NOT_A_DESKTOP_MOUSE,
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
      grepInvert: NOT_A_DESKTOP_MOUSE,
    },
    // The same two engines with a touchscreen, and **only** that: a mobile device descriptor would
    // move the viewport, the scale factor and the user agent at once, so a red test would not say
    // which of the four it was about. Firefox has no third: Playwright cannot emulate touch on
    // Gecko, which is a gap in the tooling rather than a claim about the engine.
    {
      name: 'component-touch',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Chrome'], hasTouch: true },
      timeout: COMPONENT_TIMEOUT,
      grep: NEEDS_TOUCH,
    },
    {
      name: 'component-touch-webkit',
      testDir: './',
      testMatch: ['{src,playground/src}/**/__tests__/**/*.ct.tsx'],
      use: { ...devices['Desktop Safari'], hasTouch: true },
      timeout: COMPONENT_TIMEOUT,
      grep: NEEDS_TOUCH,
      grepInvert: NEEDS_TOUCH_CDP,
    },
  ],
});
