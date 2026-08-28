#!/usr/bin/env node
/**
 * Playground smoke probe: walks every route the sidebar advertises (discovered, not hardcoded),
 * asserts each renders free of console/page errors, then drives the named interaction flows. Exists
 * because `yarn test` never renders the playground, so a broken page is otherwise green. Needs a
 * server on :3000; exit code is non-zero if any check fails.
 *
 * Usage: yarn smoke [--base <url>] [--flow <name>] [--shots <dir>] [--theme dark|light]
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
const report = (ok, said) => {
  const { label, detail = '' } = said;
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
};

// ── Interaction flows: each returns [ok, label, detail] checks ───────────────

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
  // Under `createHashHistory` the whole location lives in the fragment; otherwise the path.
  return url.hash ? url.hash.slice(1).split('#')[0] : url.pathname;
};

/**
 * Navigate to a route and *confirm we landed on it*. The playground ships two histories, browser
 * and hash (`playground:build:file`, the static-host build), and under the hash build a path URL
 * like `/api` is not a route: the router falls back to the index, so `goto` succeeds on the wrong
 * page and every per-route assertion measures the index and passes. Path first, then the hash form.
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
  /**
   * A dialog that arrived open in server-rendered HTML, adopted by `umbra/vanilla` — real server
   * rendering, and the only place this repo can do it since the playground ships static. The
   * document is built in Node and parsed before a module is fetched, on a page with no framework in
   * it at all, which is what the component test cannot prove.
   */
  async ssr(page) {
    const checks = [];

    // `<dialog open>` is in the bytes, so the browser paints it before any script exists.
    const document_ = `<!doctype html>
<html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"umbra":"/mfe/umbra.mjs","umbra/vanilla":"/mfe/umbra-vanilla.mjs"}}</script>
</head><body>
<dialog id="ssr-dialog" open><p>Rendered before any script ran.</p><button id="ssr-close">Close</button></dialog>
<span id="pre-hydration"></span><span id="phase"></span><span id="reason"></span>
<script type="module">
  // Read the pre-hydration truth first — this is the only moment it is observable.
  document.getElementById('pre-hydration').textContent = String(document.getElementById('ssr-dialog').open);
  const { bindDialog } = await import('umbra/vanilla');
  const { createDialogManager } = await import('umbra');
  const bound = bindDialog({
    id: 'ssr:panel',
    dialog: document.getElementById('ssr-dialog'),
    nonModal: true,
    ariaLabel: 'Server rendered',
    manager: createDialogManager(),
    onClose: (result) => { document.getElementById('reason').textContent = String(result.reason); },
  });
  bound.bindAction(document.getElementById('ssr-close'), { reason: 'closed' });
  // Written on every transition, not once: adoption enters at 'opening' and settles on 'open' a
  // frame later, exactly as an ordinary open does. Reading it synchronously would be reading the
  // first of the two and calling it the answer.
  const showPhase = () => { document.getElementById('phase').textContent = bound.getSnapshot().phase; };
  bound.subscribe(showPhase);
  showPhase();
</script>
</body></html>`;

    await page.route('**/__ssr-fixture', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: document_,
      });
    });
    await page.goto(`${BASE}/__ssr-fixture`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    checks.push([
      (await page.locator('#pre-hydration').textContent()) === 'true',
      'the dialog was open before any module loaded',
    ]);
    checks.push([
      (await page.locator('#phase').textContent()) === 'open',
      'the binding adopted it rather than starting from closed',
    ]);
    // Guards a store that starts at `closed` writing `display: none` over an element still open.
    const shown = await page.evaluate(() => {
      const d = document.getElementById('ssr-dialog');
      return d instanceof HTMLDialogElement && d.open && d.getBoundingClientRect().height > 0;
    });
    checks.push([shown, 'and it is still on screen, with the DOM and the store agreeing']);

    // Once adopted it is an ordinary registered dialog: its bound action closes it.
    await page.locator('#ssr-close').click();
    await page.waitForTimeout(500);
    // The *reason* too: `open === false` alone passes on a binding that named no reason.
    const closed = (await page.locator('#ssr-dialog').evaluate((d) => d.open)) === false;
    const reason = await page.locator('#reason').textContent();
    checks.push([
      closed && reason === 'closed',
      'a bound action closes the adopted dialog, with its own reason',
      `open=${String(!closed)} reason=${reason}`,
    ]);

    await page.unroute('**/__ssr-fixture');
    return checks;
  },

  /** A dialog opens from a card and Escape dismisses it. */
  async dialog(page) {
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
    const checks = [];
    await gotoRoute(page, '/getting-started');
    await page.getByRole('button', { name: 'View source code' }).first().click();
    await page.waitForTimeout(800);
    const text = (await page.locator('dialog[open]').first().textContent()) ?? '';
    checks.push([text.includes('import'), 'code viewer shows source', `${text.length} chars`]);

    // Closed by its own X, with the pointer, which is the gesture that hides a library-made focus:
    // the platform's restore rings by input modality, so this asks for the ring rather than the
    // element.
    await page.locator('dialog[open]').first().getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(600);
    checks.push([
      await page
        .getByRole('button', { name: 'View source code' })
        .first()
        .evaluate((node) => {
          return node === document.activeElement && node.matches(':focus-visible');
        }),
      'the close rings the button that opened the source panel',
    ]);

    // `/stories` is the group whose samples are *cut* out of shared files, by name, at module
    // evaluation — so a renamed declaration type-checks, passes the stories gate and CT, and throws
    // here on the first click. One panel is enough: opening any of them runs every slice.
    await gotoRoute(page, '/stories');
    await page.getByRole('button', { name: 'View source code' }).first().click();
    await page.waitForTimeout(800);
    const sliced = (await page.locator('dialog[open]').first().textContent()) ?? '';
    checks.push([sliced.length > 200, 'every harness slice resolves', `${sliced.length} chars`]);
    return checks;
  },

  /** The framework-agnostic service drives confirm → API → outcome without a component. */
  async service(page) {
    const checks = [];
    await gotoRoute(page, '/imperative');
    await page.getByRole('button', { name: 'Deploy to staging', exact: true }).click();
    await page.waitForTimeout(700);
    const confirm = (await page.locator('dialog[open]').first().textContent()) ?? '';
    checks.push([confirm.includes('Confirm deployment'), 'service opened the confirm dialog']);
    await page.getByRole('button', { name: 'Deploy', exact: true }).click();
    await page.waitForTimeout(2400);
    const card = page.locator('[data-surface-card]', { hasText: 'Service Layer' });
    const log = ((await card.textContent()) ?? '').replace(/\s+/g, ' ');
    checks.push([/Deploying to staging/.test(log), 'service called the API']);
    checks.push([
      /Deployed to staging|Deploy to staging failed/.test(log),
      'service reported the outcome',
    ]);
    return checks;
  },

  /** A close payload survives `close(data)` → the store → `onClose` → the page. */
  async forms(page) {
    const checks = [];
    await gotoRoute(page, '/ui-integrations');

    // By dialog id, not "whatever is open": the previous one may still be exiting with `open` set.
    const forms = [
      { id: 'mui-form-example', trigger: /open mui form/i, name: 'Ada Lovelace' },
      { id: 'vanilla-form-example', trigger: /open vanilla form/i, name: 'Grace Hopper' },
    ];

    for (const form of forms) {
      const dialog = page.getByTestId(`dialog-${form.id}`);
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

      // `simulateApiCall` fails 30% of the time on purpose and the form correctly stays open.
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

      // Each form contributes a distinct name, so this cannot pass on the other one's result.
      const text = await page.locator('main').innerText();
      checks.push([text.includes(form.name), `${form.id} payload reached the page`]);
    }

    return checks;
  },

  /**
   * One Escape closes a dialog whose content holds nothing focusable: `showModal()` then puts focus
   * outside the dialog, a dialog-element keydown listener never sees the key, and the browser's own
   * cancel closes it behind the store's back. Only the real page produces that condition itself.
   */
  async esc(page) {
    const checks = [];
    await gotoRoute(page, '/getting-started');
    const card = page.locator('[data-surface-card]', { hasText: 'Async Open' });
    const dialog = page.getByTestId('dialog-async-open');

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
   * A warm open shows no loading flash. `onOpen` runs on every open and an `async` function returns
   * a promise with nothing to await, so `isPreparing` is briefly true even with the data there and
   * gating on it alone makes the fallback start visible. Sampled frame by frame, because a 250ms
   * crossfade is invisible to an end-state assertion.
   */
  async asyncopen(page) {
    const checks = [];
    await gotoRoute(page, '/getting-started');
    const card = page.locator('[data-surface-card]', { hasText: 'Async Open' });

    // Peak opacity of the fallback layer over the 600ms following a click.
    const peakFallbackOpacity = () => {
      return page.evaluate(() => {
        return new Promise((done) => {
          const seen = [];
          const started = performance.now();
          const tick = () => {
            const dialog = document.querySelector('[data-testid="dialog-async-open"]');
            // Either flavour's ContentTransition: vanilla carries its grid as a hashed class,
            // MUI writes it inline.
            const layer = dialog?.querySelector(
              'div[class*="transitionGrid"] > div, div[style*="grid"] > div'
            );
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

  /**
   * A declared hotkey actually fires its action — a refactor once dropped `hotkey` from six
   * examples and all 403 library tests still passed, the playground having none of its own.
   */
  async hotkey(page) {
    const checks = [];
    await gotoRoute(page, '/dialog-actions');

    const dialog = page.getByTestId('dialog-confirm-hotkeys');
    await page
      .getByRole('button', { name: /open confirm/i })
      .first()
      .click();
    await dialog.waitFor({ state: 'visible' });

    // The button must advertise the shortcut, which is how the key path finds it at all.
    const confirm = dialog.locator('button', { hasText: /confirm/i }).last();
    const shortcut = await confirm.getAttribute('aria-keyshortcuts');
    checks.push([
      shortcut !== null,
      'the action button advertises aria-keyshortcuts',
      `${shortcut}`,
    ]);

    // To the dialog, not the page: a page-level press depends on whatever last held focus.
    await page.waitForTimeout(400);
    await dialog.press('Enter');
    const closed = await waitFor(async () => {
      return !(await dialog.evaluate((n) => {
        return n.hasAttribute('open');
      }));
    });
    checks.push([closed, 'pressing the declared hotkey closes the dialog']);

    const text = ((await page.locator('body').textContent()) ?? '').replace(/\s+/g, ' ');
    checks.push([/Closed: confirm/.test(text), "it closed with the action's own reason"]);
    return checks;
  },

  /**
   * A contained non-modal panel leaves the region it sits over usable, by mouse and by keyboard.
   *
   * Geometry, so it is checked as geometry: `elementFromPoint` at a row's left edge is the only
   * thing that answers what the browser would hit, and the click is placed there because a
   * full-width row is covered at its centre. No other gate renders the playground.
   */
  async contained(page) {
    const checks = [];
    await gotoRoute(page, '/slide-dialog');

    const rows = page.getByRole('button', { name: /Invoice 10\d\d/ });
    const panel = page.locator('dialog[data-dialog-id="slide-preset-inspector"]');

    await rows.first().click();
    await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);

    const covered = [];
    for (const index of [0, 1, 2]) {
      const box = await rows.nth(index).boundingBox();
      if (box === null) {
        covered.push(index);
        continue;
      }
      const hitsPanel = await page.evaluate(
        ([x, y]) => {
          return document.elementFromPoint(x, y)?.closest('dialog') !== null;
        },
        [box.x + 40, box.y + box.height / 2]
      );
      if (hitsPanel) {
        covered.push(index);
      }
    }
    checks.push([
      covered.length === 0,
      'every row is reachable while the panel is open',
      `covered: [${covered.join(', ')}]`,
    ]);

    // Stated as "focus can leave" rather than "focus is contained": a non-modal panel exists so
    // the page behind it stays usable, and `containFocus` over a single focusable child loops Tab
    // and Shift+Tab onto it, leaving Escape the only exit.
    const left = await (async () => {
      for (let i = 0; i < 6; i += 1) {
        await page.keyboard.press('Tab');
        const inside = await page.evaluate(() => {
          return document.activeElement?.closest('dialog') !== null;
        });
        if (!inside) return true;
      }
      return false;
    })();
    checks.push([left, 'Tab leaves the non-modal panel rather than looping inside it']);

    // The list answers ↑/↓ itself, through the library's own key utilities.
    const focused = async () => {
      return page.evaluate(() => {
        return document.activeElement?.textContent?.trim().slice(0, 12) ?? 'none';
      });
    };
    await rows.first().focus();
    await page.keyboard.press('ArrowDown');
    checks.push([(await focused()).startsWith('Invoice 1044'), 'the list walks down on ArrowDown']);
    await page.keyboard.press('ArrowUp');
    checks.push([(await focused()).startsWith('Invoice 1043'), 'and back up on ArrowUp']);
    // `matchesHotkey` compares modifiers exactly, so a held one is the browser's press, not ours.
    const held = await focused();
    await page.keyboard.press('Control+ArrowDown');
    checks.push([(await focused()) === held, 'a held modifier falls through instead of moving']);

    // The rows are tab stops, so the ring has to survive the scroller that clips this card.
    await rows.nth(2).focus();
    const ring = await rows.nth(2).evaluate((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const sr = el.parentElement.getBoundingClientRect();
      const w = Number.parseFloat(s.outlineWidth);
      return {
        drawn: s.outlineStyle !== 'none' && w > 0,
        inside: r.top - w >= sr.top - 1 && r.bottom + w <= sr.bottom + 1,
      };
    });
    checks.push([
      ring.drawn && ring.inside,
      'a focused row draws a ring the scroller does not clip',
    ]);

    await rows.nth(2).click({ position: { x: 40, y: 20 } });
    await page.waitForTimeout(400);
    checks.push([await panel.isVisible(), 'choosing another row does not close the panel']);
    checks.push([
      (await rows.nth(2).getAttribute('aria-current')) === 'true',
      'the chosen row reports itself, rather than only being painted',
    ]);
    checks.push([
      await panel.getByText('Invoice 1045').first().isVisible(),
      'the panel followed the row that was chosen',
    ]);
    // The panel was opened from row 0 and is showing row 2, so where the close lands is the whole
    // difference `restoreFocusTo` makes — and nothing else in the suite ever closes this one.
    await panel.getByRole('button', { name: 'Close' }).click();
    await page.waitForTimeout(600);
    checks.push([!(await panel.isVisible()), 'the panel closes from its own button']);
    checks.push([
      await rows.nth(2).evaluate((node) => {
        return node === document.activeElement;
      }),
      'the close hands the keyboard to the row on screen, not the row that opened it',
    ]);
    return checks;
  },

  /** Section jump bars stick under the top bar (an ancestor `overflow` silently breaks this). */
  async sticky(page) {
    await gotoRoute(page, '/stories');
    await page.evaluate(() => window.scrollTo(0, 1400));
    await page.waitForTimeout(500);
    const box = await page.locator('nav[aria-label="Jump to section"]').boundingBox();
    const y = box?.y ?? -1;
    // Read the bar's height off the token rather than restating it: the literal was 64, and the
    // check failed the day the shell's bar changed height, which is not what it is here to catch.
    const barHeight = await page.evaluate(() => {
      return parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--app-topbar-height')
      );
    });
    return [
      [
        Math.abs(y - barHeight) < 2,
        'jump bar sticks below the top bar',
        `y=${y}, bar=${barHeight}`,
      ],
    ];
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
  // Measured, not matched: dark mode is `#0f172a`, so testing `rgb(0, 0, 0)` reports every page
  // as light and silently makes `--theme dark` a no-op.
  const luminance = async () => {
    return page.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.body)
        .backgroundColor.match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    });
  };
  const before = await luminance();
  if ((THEME === 'dark') !== before < 0.5) {
    await page.locator('header button').last().click();
    await page.waitForTimeout(500);
    const after = await luminance();
    if ((THEME === 'dark') !== after < 0.5) {
      console.log(
        `FAIL theme:${THEME} — the toggle did not land there (luminance ${after.toFixed(2)})`
      );
      process.exit(1);
    }
  }
}

// Waited for, not read straight away: `networkidle` is not hydration, so on a cold dev server
// (typedoc takes ~10s) the query returns empty, the route loop walks nothing, and every assertion
// passes vacuously — this was once green against a playground whose `/api` was broken.
await page.waitForSelector('nav a[href]', { timeout: 15_000 }).catch(() => {
  // Reported by the assertion below rather than thrown from a helper.
});
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
report(routes.length > 0, { label: `discovered ${String(routes.length)} routes from the sidebar` });

// Two routes with the same `<h1>` means one page served twice — the backstop for `gotoRoute`.
const titleByRoute = new Map();

// `cards > 0` is the "rendered its content" signal; the scratch surface is empty on purpose, and
// still held to reaching, one `<h1>`, and no console error.
const EMPTY_BY_DESIGN = new Set(['/warzone']);

for (const route of routes) {
  errors.length = 0;

  try {
    await gotoRoute(page, route);
  } catch (error) {
    report(false, { label: route.padEnd(20), detail: error.message });
    continue;
  }

  const cards = await page.locator('[data-surface-card]').count();
  const h1s = await page.locator('h1').allTextContents();
  if (h1s.length === 1) titleByRoute.set(route, h1s[0]);

  const needsCards = !EMPTY_BY_DESIGN.has(route);

  report((cards > 0 || !needsCards) && errors.length === 0 && h1s.length === 1, {
    label: route.padEnd(20),
    detail: `cards=${String(cards)}${needsCards ? '' : ' (empty by design)'} h1=${JSON.stringify(h1s)}${
      errors.length ? ` ERRORS: ${errors.slice(0, 2).join(' | ')}` : ''
    }`,
  });

  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/shot${route.replace(/\//g, '-')}.png` });
  }
}

const seenTitles = new Set();
const repeated = [...titleByRoute.values()].filter((title) => {
  const already = seenTitles.has(title);
  seenTitles.add(title);
  return already;
});
report(repeated.length === 0, {
  label: 'every route rendered its own page',
  detail: repeated.length ? `repeated <h1>: ${[...new Set(repeated)].join(', ')}` : '',
});

const selected = FLOW ? [FLOW] : Object.keys(flows);
for (const name of selected) {
  const flow = flows[name];
  if (!flow) {
    report(false, {
      label: `flow:${name}`,
      detail: `unknown — known flows: ${Object.keys(flows).join(', ')}`,
    });
    continue;
  }
  errors.length = 0;
  try {
    for (const [ok, label, detail] of await flow(page)) {
      report(ok, { label: `flow:${name} ${label}`, detail: detail });
    }
  } catch (error) {
    // Otherwise the run dies on the first bad selector and a navigation failure reports as a 30s
    // Playwright timeout.
    report(false, { label: `flow:${name} threw`, detail: error.message.split('\n')[0] });
  }
  report(errors.length === 0, {
    label: `flow:${name} no console errors`,
    detail: errors.slice(0, 2).join(' | '),
  });
}

await browser.close();
console.log(failures === 0 ? '\nALL GREEN' : `\n${String(failures)} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
