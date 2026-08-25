#!/usr/bin/env node
/**
 * Reusable Playwright probe: drives a modal in the playground by id and measures it.
 *
 * Run from the PROJECT ROOT (so `playwright` resolves from node_modules) with the dev
 * server (`npm run dev`) running. Auto-detects the Vite port (3000–3010) unless --url given.
 *
 *   node .claude/skills/dialog-debug/probe.mjs --mode slide
 *   node .claude/skills/dialog-debug/probe.mjs --mode slide --dir Right --non-modal
 *   node .claude/skills/dialog-debug/probe.mjs --mode trajectory --dir Right --non-modal
 *   node .claude/skills/dialog-debug/probe.mjs --id slide-preset-sheet --axis y
 *   node .claude/skills/dialog-debug/probe.mjs --mode logs
 *
 * Modes:
 *   slide       Open the panel and report how many DISTINCT rendered positions the dialog
 *               passes through (many = smooth slide, ~1 = jump/pop) + travel span. Runs all
 *               four directions unless --dir is given. Grabs enough frames to be reliable.
 *   trajectory  Dump transform(px) + rect over the entrance for one direction (needs --dir).
 *   size        For every (direction × mode) combo, set width/height/unit and report the
 *               dialog's measured box so you can see which combos respond to the SIZE pane.
 *   state       Open, then toggle a structural prop while open; report whether it tore down
 *               cleanly (not stuck open) and can reopen. --toggle Non-dialog|Portal.
 *   logs        Enable `dialog:log=*`, run a small open/close/toggle sequence, print the
 *               library's own lifecycle/manager logs (register/open/close/teardown).
 *
 * Flags: --dir Left|Right|Top|Bottom  --non-modal  --portal  --unit px|vw|vh|%
 *        --width N  --height N  --toggle Non-dialog|Portal  --url <url>  --headed  --slow
 */
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const opts = {
  mode: val('--mode', 'slide'),
  dir: val('--dir', null),
  nonModal: has('--non-modal'),
  portal: has('--portal'),
  unit: val('--unit', null),
  width: val('--width', null),
  height: val('--height', null),
  toggle: val('--toggle', 'Portal'),
  url: val('--url', null),
  headed: has('--headed'),
  slow: has('--slow'),
  // Any modal on any page; the slide presets are the default target.
  id: val('--id', 'slide-preset-drawer'),
  route: val('--route', '/slide-dialog'),
  openLabel: val('--open-label', 'Right drawer'),
  closeLabel: val('--close-label', 'Done'),
  axis: val('--axis', null),
};

const TID = `[data-testid="dialog-${opts.id}"]`;

/**
 * There is no configurator any more: each slide shape is its own preset with its own modal id
 * (`slide-preset-drawer`, `-sheet`, `-palette`, `-inspector`), so a shape is selected by probing
 * a different `--id` rather than by driving controls. Pass `--axis x|y` to say which way the
 * target moves.
 */
const PRESET_AXIS = {
  'slide-preset-drawer': 'x',
  'slide-preset-sheet': 'y',
  'slide-preset-palette': 'y',
  'slide-preset-inspector': 'x',
};

/**
 * Normalize `--route` to a leading-slash path. Accepts `slide-dialog` as well as
 * `/slide-dialog`, because Git Bash / MSYS rewrites a leading-slash argument into a Windows
 * path (`/slide-dialog` → `C:/Program Files/Git/slide-dialog`) — so the slash-less form is the
 * one that survives that shell. Also tolerates a full URL being passed here.
 */
function normalizeRoute(route) {
  if (/^https?:\/\//.test(route)) return route;
  const bare = route.replace(/^.*[/\\]([^/\\]+)$/, '$1');
  const path = route.includes(':') || route.includes('\\') ? bare : route;
  return path.startsWith('/') ? path : `/${path}`;
}

async function resolveUrl() {
  if (opts.url) return opts.url;
  const route = normalizeRoute(opts.route);
  if (/^https?:\/\//.test(route)) return route;
  for (let p = 3000; p <= 3010; p++) {
    try {
      const r = await fetch(`http://localhost:${p}/`, { signal: AbortSignal.timeout(300) });
      if (r.ok) return `http://localhost:${p}${route}`;
    } catch {
      /* next */
    }
  }
  throw new Error('Could not find dev server on ports 3000-3010; pass --url');
}

async function newPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  await page.goto(await resolveUrl(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return page;
}
const openPanel = (page) =>
  page.getByRole('button', { name: opts.openLabel, exact: true }).first().click();
const closePanel = async (page) => {
  const c = page.getByRole('button', { name: opts.closeLabel, exact: true }).first();
  if (await c.count()) {
    await c.click().catch(() => {});
    await page.waitForTimeout(350);
  }
};

// Record the dialog's rendered position every frame from the moment it opens.
async function recordSlide(page, axis) {
  await openPanel(page);
  await page.evaluate(
    async ({ tid, axis }) => {
      window.__p = [];
      const dq = () => document.querySelector(tid);
      const t0 = performance.now();
      await new Promise((res) => {
        (function w() {
          const d = dq();
          if (d && d.hasAttribute('open')) return res();
          if (performance.now() - t0 > 1500) return res();
          requestAnimationFrame(w);
        })();
      });
      const s = performance.now();
      await new Promise((res) => {
        (function tick() {
          const d = dq();
          if (d && d.hasAttribute('open')) {
            const r = d.getBoundingClientRect();
            const m = getComputedStyle(d).transform.match(
              /matrix\(1, 0, 0, 1, ([-\d.]+), ([-\d.]+)\)/
            );
            window.__p.push({
              t: Math.round(performance.now() - s),
              pos: Math.round(axis === 'x' ? r.x : r.y),
              tx: m ? Math.round(+m[1]) : 0,
              ty: m ? Math.round(+m[2]) : 0,
              w: Math.round(r.width),
              h: Math.round(r.height),
            });
          }
          if (performance.now() - s < 500) requestAnimationFrame(tick);
          else res();
        })();
      });
    },
    { tid: TID, axis }
  );
  return page.evaluate(() => window.__p);
}

async function main() {
  const browser = await chromium.launch({ headless: !opts.headed, slowMo: opts.slow ? 300 : 0 });

  if (opts.mode === 'slide') {
    // One target, probed on the axis it actually moves along: --axis, or the axis this preset
    // is known to travel on.
    for (const dir of [null]) {
      const page = await newPage(browser);
      const axis = opts.axis ?? PRESET_AXIS[opts.id] ?? 'x';
      const p = await recordSlide(page, axis);
      const label = dir ?? `${opts.id} (${axis})`;
      if (!p.length) {
        console.log(label.padEnd(6), 'NO SAMPLES (open failed?)');
        await page.close();
        continue;
      }
      const positions = p.map((o) => o.pos);
      const distinct = new Set(positions).size;
      const span = Math.max(...positions) - Math.min(...positions);
      const verdict = distinct >= 8 ? 'SLIDE ✓' : distinct <= 2 ? 'JUMP/POP ✗' : 'partial ?';
      const modeLabel = '';
      console.log(
        `${label.padEnd(6)}${modeLabel} frames ${String(p.length).padStart(2)} | distinct ${String(distinct).padStart(2)} | span ${String(span).padStart(4)} | ${verdict}`
      );
      await page.close();
    }
  } else if (opts.mode === 'trajectory') {
    const page = await newPage(browser);
    const axis = opts.axis ?? PRESET_AXIS[opts.id] ?? 'x';
    const p = await recordSlide(page, axis);
    console.log(`trajectory ${opts.id} (axis ${axis}):`);
    for (const o of p.filter((_, i) => i % 2 === 0))
      console.log(
        `  t=${String(o.t).padStart(3)} tx=${String(o.tx).padStart(4)} ty=${String(o.ty).padStart(4)} pos=${String(o.pos).padStart(4)} ${o.w}x${o.h}`
      );
    await page.close();
  } else if (opts.mode === 'state') {
    const page = await newPage(browser);
    await openPanel(page);
    await page.waitForTimeout(400);
    const before = await page
      .locator(TID)
      .evaluate((e) => e.hasAttribute('open'))
      .catch(() => false);
    await page.getByRole('checkbox', { name: opts.toggle }).click();
    await page.waitForTimeout(400);
    const after = await page
      .locator(TID)
      .evaluate((e) => e.hasAttribute('open'))
      .catch(() => 'gone');
    let reopenOk = false;
    try {
      await openPanel(page);
      await page.waitForTimeout(400);
      reopenOk = await page.locator(TID).evaluate((e) => e.hasAttribute('open'));
    } catch {
      /* stuck */
    }
    console.log(
      `toggle "${opts.toggle}" while open | open before=${before} after=${after} | reopenOk=${reopenOk} ${reopenOk ? '✓' : '✗ STUCK'}`
    );
    await page.close();
  } else if (opts.mode === 'logs') {
    const page = await newPage(browser);
    const logs = [];
    page.on('console', (m) => {
      if (/dialog:(modal|manager|lifecycle)/.test(m.text()))
        logs.push(
          m
            .text()
            .replace(/%c|color:[^ ]*|font-weight[^ ]*|padding[^ ]*|border-radius[^ ]*/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        );
    });
    await page.evaluate(() => {
      try {
        localStorage.setItem('dialog:log', '*');
      } catch {
        /* */
      }
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const mark = (s) => logs.push(`--- ${s}`);
    mark('OPEN');
    await openPanel(page);
    await page.waitForTimeout(400);
    mark('CLOSE');
    await closePanel(page);
    console.log(logs.join('\n'));
    await page.close();
  } else {
    console.log('Unknown --mode. See header for modes.');
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
