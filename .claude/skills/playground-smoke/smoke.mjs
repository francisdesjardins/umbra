#!/usr/bin/env node
/**
 * Playground smoke probe.
 *
 * Walks every route the sidebar advertises, asserts each one renders and stays free of
 * console/page errors, then optionally drives a named interaction flow.
 *
 * Routes are discovered from the running app's navigation, not hardcoded — adding a route to
 * the sidebar puts it under test automatically.
 *
 * Usage (from the repo root, with a server already running):
 *   node .claude/skills/playground-smoke/smoke.mjs
 *   node .claude/skills/playground-smoke/smoke.mjs --base http://localhost:3000
 *   node .claude/skills/playground-smoke/smoke.mjs --flow service
 *   node .claude/skills/playground-smoke/smoke.mjs --shots <dir>
 *   node .claude/skills/playground-smoke/smoke.mjs --theme dark
 *
 * Exit code is non-zero if any check fails, so it can gate a commit.
 */
import { chromium } from '@playwright/test';

// ── Args ─────────────────────────────────────────────────────────────────────

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:3000');
const SHOTS = arg('shots');
const FLOW = arg('flow');
const THEME = arg('theme');

// ── Reporting ────────────────────────────────────────────────────────────────

let failures = 0;
const report = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

// ── Interaction flows ────────────────────────────────────────────────────────
//
// Each flow returns a list of [ok, label, detail] checks. Add one here rather than writing a
// throwaway script; a flow that lives in the repo gets rerun on the next change.

/** Poll `predicate` until it holds or the budget runs out. Returns whether it held. */
async function waitFor(predicate, { timeout = 8000, interval = 100 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await predicate()) return true;
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/** The route the app is actually showing, whichever history the build uses. */
const currentRoute = (page) => {
  const url = new URL(page.url());
  // Under `createHashHistory` the whole location lives in the fragment, so that is the route;
  // otherwise the path is.
  return url.hash ? url.hash.slice(1).split('#')[0] : url.pathname;
};

/**
 * Navigate to a playground route and *confirm we landed on it*.
 *
 * The playground ships two histories: browser (`yarn playground:build`) and hash
 * (`yarn playground:build:file`, the static-host build). Under the hash build a path URL like
 * `/api` is not a route at all — the server returns index.html and the router falls back to the
 * index, so a plain `goto` succeeds while showing the wrong page. Every per-route assertion
 * then measures the index page instead, and passes. So: try the path, fall back to the hash
 * form, and refuse to continue if neither lands.
 */
async function gotoRoute(page, route) {
  for (const url of [`${BASE}${route}`, `${BASE}/#${route}`]) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    if (currentRoute(page) === route) return;
  }
  throw new Error(
    `navigation to ${route} landed on ${currentRoute(page)} (${page.url()}) — neither the path nor the hash form reached it`
  );
}

const flows = {
  /** A modal opens from a card and Escape dismisses it. */
  async modal(page) {
    const checks = [];
    await gotoRoute(page, '/getting-started');
    await page.getByRole('button', { name: 'Open', exact: true }).first().click();
    await page.waitForTimeout(600);
    checks.push([(await page.locator('dialog[open]').count()) > 0, 'a card button opens a dialog']);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    checks.push([(await page.locator('dialog[open]').count()) === 0, 'Escape dismisses it']);
    return checks;
  },

  /** The source viewer resolves a code sample. */
  async codeviewer(page) {
    await gotoRoute(page, '/getting-started');
    await page.getByRole('button', { name: 'View source code' }).first().click();
    await page.waitForTimeout(800);
    const text = (await page.locator('dialog[open]').first().textContent()) ?? '';
    return [[text.includes('import'), 'code viewer shows source', `${text.length} chars`]];
  },

  /** The framework-agnostic service drives confirm → API → outcome without a component. */
  async service(page) {
    const checks = [];
    await gotoRoute(page, '/advanced');
    await page.getByRole('button', { name: 'Deploy to staging', exact: true }).click();
    await page.waitForTimeout(700);
    const confirm = (await page.locator('dialog[open]').first().textContent()) ?? '';
    checks.push([confirm.includes('Confirm deployment'), 'service opened the confirm dialog']);
    await page.getByRole('button', { name: 'Deploy', exact: true }).click();
    await page.waitForTimeout(2400);
    const card = page.locator('.MuiCard-root', { hasText: 'Service Layer' });
    const log = ((await card.textContent()) ?? '').replace(/\s+/g, ' ');
    checks.push([/Deploying to staging/.test(log), 'service called the API']);
    checks.push([
      /Deployed to staging|Deploy to staging failed/.test(log),
      'service reported the outcome',
    ]);
    return checks;
  },

  /**
   * A close payload survives the whole round trip: an action's `close(data)` → the store →
   * `onClose` → the page. The types say it does; this watches it happen.
   */
  async forms(page) {
    const checks = [];
    await gotoRoute(page, '/ui-integrations');

    // Each form is addressed by its own modal id rather than "whatever dialog is open" — the
    // previous one may still be finishing its exit animation with `open` still set, and a
    // stray `dialog[open] input` match would fill the wrong form.
    const forms = [
      { id: 'mui-form-example', trigger: /open mui form/i, name: 'Ada Lovelace' },
      { id: 'vanilla-form-example', trigger: /open vanilla form/i, name: 'Grace Hopper' },
    ];

    for (const form of forms) {
      const dialog = page.getByTestId(`modal-${form.id}`);
      const email = `${form.name.split(' ')[0].toLowerCase()}@example.com`;
      const isOpen = async () => {
        return dialog.evaluate((node) => {
          return node.hasAttribute('open');
        });
      };

      await page.getByRole('button', { name: form.trigger }).click();
      await dialog.waitFor({ state: 'visible' });

      const inputs = dialog.locator('input');
      await inputs.nth(0).fill(form.name);
      await inputs.nth(1).fill(email);

      // `simulateApiCall` fails 30% of the time on purpose — it is how the demo shows error
      // handling — and the form correctly stays open on failure. Two forms would then make
      // roughly half of all runs red for a reason that has nothing to do with what this flow
      // asserts, so retry the submit until the mock cooperates.
      let closed = false;
      for (let attempt = 1; attempt <= 5 && !closed; attempt += 1) {
        await dialog
          .locator('button', { hasText: /create user/i })
          .first()
          .click();
        closed = await waitFor(async () => {
          return !(await isOpen());
        });
      }
      checks.push([closed, `${form.id} closed after submit`]);

      // The payload only reaches the page through `close(data)` → `onClose` → the store, and
      // each form contributes a distinct name, so this cannot pass on the other one's result.
      const text = await page.locator('main').innerText();
      checks.push([text.includes(form.name), `${form.id} payload reached the page`]);
    }

    return checks;
  },

  /**
   * One Escape closes a modal whose content holds nothing focusable.
   *
   * `showModal()` has nowhere to put focus in that case, so it lands outside the dialog — and
   * a dialog-element keydown listener never sees the key. The browser's own cancel then closed
   * the `<dialog>` behind the store's back: still rendered, out of the top layer, backdrop
   * gone, sitting wherever it happens to be in the tree. The component suite reproduces this
   * with a synthetic blur; only the real page produces the focus condition on its own.
   */
  async esc(page) {
    const checks = [];
    await gotoRoute(page, '/getting-started');
    const card = page.locator('.MuiCard-root', { hasText: 'Async Open' });
    const dialog = page.getByTestId('modal-async-open');

    await card.getByRole('button', { name: 'Open', exact: true }).click();
    // Press while the query is still running: the loading panel has nothing focusable.
    await page.waitForTimeout(400);
    checks.push([
      !(await dialog.evaluate((node) => {
        return node.contains(document.activeElement);
      })),
      'focus is outside the dialog (the condition that breaks a keydown-only listener)',
    ]);

    await page.keyboard.press('Escape');
    const settled = await waitFor(async () => {
      return dialog.evaluate((node) => {
        return !node.hasAttribute('open') && node.getBoundingClientRect().width === 0;
      });
    });
    checks.push([settled, 'one Escape closes it, leaving nothing rendered']);

    const text = (await card.innerText()).replace(/\s+/g, ' ');
    checks.push([/Closed: dismiss/.test(text), 'it closed with reason "dismiss"']);
    return checks;
  },

  /**
   * A warm open shows no loading flash.
   *
   * `onOpen` runs on every open — an `async` function returns a promise even when a warm cache
   * gives it nothing to await — so `isPreparing` is briefly true even when the data is already
   * there. Gate the fallback on `isPreparing` alone and it starts visible and fades out for no
   * reason. Sampled frame by frame, because a 250ms crossfade is invisible to any assertion
   * that only looks at the end state.
   */
  async asyncopen(page) {
    const checks = [];
    await gotoRoute(page, '/getting-started');
    const card = page.locator('.MuiCard-root', { hasText: 'Async Open' });

    // Peak opacity of the fallback layer over the 600ms following a click.
    const peakFallbackOpacity = () => {
      return page.evaluate(() => {
        return new Promise((done) => {
          const seen = [];
          const started = performance.now();
          const tick = () => {
            const dialog = document.querySelector('[data-testid="modal-async-open"]');
            const layer = dialog?.querySelector('div[style*="grid"] > div');
            if (layer) seen.push(Number(getComputedStyle(layer).opacity));
            if (performance.now() - started < 600) requestAnimationFrame(tick);
            else done(Math.max(...seen, 0));
          };
          requestAnimationFrame(tick);
        });
      });
    };

    const cold = peakFallbackOpacity();
    await card.getByRole('button', { name: 'Open', exact: true }).click();
    checks.push([(await cold) > 0.9, 'a cold open does show the fallback']);

    await waitFor(async () => {
      return (await card.innerText()).includes('Refetch');
    });
    await page.getByRole('button', { name: 'OK', exact: true }).click();
    await page.waitForTimeout(700);

    const warm = peakFallbackOpacity();
    await card.getByRole('button', { name: 'Open', exact: true }).click();
    const peak = await warm;
    checks.push([peak < 0.05, 'a warm open never shows it', `peak opacity ${String(peak)}`]);
    return checks;
  },

  /** Section jump bars stick under the top bar (an ancestor `overflow` silently breaks this). */
  /**
   * A declared hotkey actually fires its action.
   *
   * This exists because a refactor once dropped `hotkey` from six playground examples and
   * every one of the 403 library tests still passed — correctly, since the playground has no
   * tests of its own by design. A hotkey that silently stops working is invisible to a probe
   * that only checks a page renders, so it gets checked here.
   */
  async hotkey(page) {
    const checks = [];
    await gotoRoute(page, '/modal-actions');

    const dialog = page.getByTestId('modal-confirm-hotkeys');
    await page.getByRole('button', { name: /open confirm/i }).first().click();
    await dialog.waitFor({ state: 'visible' });

    // The button must advertise the shortcut, which is how the key path finds it at all.
    const confirm = dialog.locator('button', { hasText: /confirm/i }).last();
    const shortcut = await confirm.getAttribute('aria-keyshortcuts');
    checks.push([shortcut !== null, 'the action button advertises aria-keyshortcuts', `${shortcut}`]);

    // Enter is declared on `confirm`, so pressing it must close with that reason — the same
    // outcome a click produces.
    await page.keyboard.press('Enter');
    const closed = await waitFor(async () => {
      return !(await dialog.evaluate((n) => {
        return n.hasAttribute('open');
      }));
    });
    checks.push([closed, 'pressing the declared hotkey closes the modal']);

    const text = ((await page.locator('body').textContent()) ?? '').replace(/\s+/g, ' ');
    checks.push([/Closed: confirm/.test(text), "it closed with the action's own reason"]);
    return checks;
  },

  async sticky(page) {
    await gotoRoute(page, '/stories');
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(500);
    const box = await page.locator('nav[aria-label="Jump to section"]').boundingBox();
    const y = box?.y ?? -1;
    return [[Math.abs(y - 64) < 2, 'jump bar sticks below the top bar', `y=${y}`]];
  },
};

// ── Run ──────────────────────────────────────────────────────────────────────

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

await page.goto(BASE, { waitUntil: 'networkidle' });

if (THEME === 'dark' || THEME === 'light') {
  // The toggle flips between the two; click it if we are not already where we want to be.
  const isDark = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)';
  });
  if ((THEME === 'dark') !== isDark) {
    await page.locator('header button').last().click();
    await page.waitForTimeout(500);
  }
}

// Discover routes from the sidebar rather than hardcoding them.
const routes = await page.$$eval('nav a[href]', (links) => {
  return [
    ...new Set(
      links
        .map((a) => new URL(a.href).pathname + new URL(a.href).hash)
        .map((p) => p.replace(/^\/#/, ''))
        .filter((p) => p !== '/' && !p.includes('#'))
    ),
  ];
});
report(routes.length > 0, `discovered ${String(routes.length)} routes from the sidebar`);

// Every route must render a distinct page: two routes reporting the same `<h1>` means the app
// served one page twice. Collected here and checked for duplicates afterwards, as the backstop
// for `gotoRoute` in case both URL forms are ever wrong at once.
const titleByRoute = new Map();

for (const route of routes) {
  errors.length = 0;

  try {
    await gotoRoute(page, route);
  } catch (error) {
    report(false, route.padEnd(20), error.message);
    continue;
  }

  const cards = await page.locator('.MuiCard-root').count();
  const h1s = await page.locator('h1').allTextContents();
  if (h1s.length === 1) titleByRoute.set(route, h1s[0]);

  report(
    cards > 0 && errors.length === 0 && h1s.length === 1,
    route.padEnd(20),
    `cards=${String(cards)} h1=${JSON.stringify(h1s)}${
      errors.length ? ` ERRORS: ${errors.slice(0, 2).join(' | ')}` : ''
    }`
  );

  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/shot${route.replace(/\//g, '-')}.png` });
  }
}

const repeated = [...titleByRoute.values()].filter((title, i, all) => {
  return all.indexOf(title) !== i;
});
report(
  repeated.length === 0,
  'every route rendered its own page',
  repeated.length ? `repeated <h1>: ${[...new Set(repeated)].join(', ')}` : ''
);

const selected = FLOW ? [FLOW] : Object.keys(flows);
for (const name of selected) {
  const flow = flows[name];
  if (!flow) {
    report(false, `flow:${name}`, `unknown — known flows: ${Object.keys(flows).join(', ')}`);
    continue;
  }
  errors.length = 0;
  try {
    for (const [ok, label, detail] of await flow(page)) {
      report(ok, `flow:${name} ${label}`, detail);
    }
  } catch (error) {
    // Without this the whole run dies on the first bad selector, and a flow that could not even
    // reach its page reports as a 30-second Playwright timeout rather than as the navigation
    // failure it is. Every other flow still gets to run.
    report(false, `flow:${name} threw`, error.message.split('\n')[0]);
  }
  report(errors.length === 0, `flow:${name} no console errors`, errors.slice(0, 2).join(' | '));
}

await browser.close();
console.log(failures === 0 ? '\nALL GREEN' : `\n${String(failures)} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
