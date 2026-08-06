#!/usr/bin/env node
/**
 * Ask a real browser what it actually rendered.
 *
 * A page is driven through an ordered list of `--do` steps, then answered with an ordered list of
 * `--probe` questions. Both are small enough to type at a prompt, which is the point: the
 * alternative is a throwaway script per question, and those get written wrong under time pressure.
 *
 * Chrome by default, not Chromium — a bundled browser is not the browser anyone ships to.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);

/**
 * Steps and questions in the order they were typed, not grouped by kind.
 *
 * The interleaving is the whole ergonomics: `--do open --probe at:20,20 --do close --probe count`
 * reads as a script. Collecting all the steps first and asking afterwards silently answers every
 * question about the final state — which looks like a working probe and reports nonsense.
 */
function timeline() {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--do' || argv[i] === '--probe') {
      out.push({ kind: argv[i].slice(2), value: argv[i + 1] ?? '' });
      i += 1;
    }
  }
  return out;
}

function flag(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (argv[index + 1] ?? fallback);
}

const has = (name) => {
  return argv.includes(`--${name}`);
};

if (has('help') || argv.length === 0) {
  console.log(
    `
dom-probe — drive a page, then ask what it rendered

  node .claude/skills/dom-probe/probe.mjs --url <url> [--do <step>]... [--probe <question>]...

steps (applied in order)
  click:<selector>        click the first match
  click-at:<x>,<y>        click viewport coordinates
  key:<Key>               press a key (Escape, Enter, F5, …)
  fill:<selector>=<text>  type into a field
  wait:<ms>               pause
  settle:<selector>       wait until the element's box stops changing (open transitions)
  shot:<name>             screenshot into --out

questions (asked in order, after every step)
  at:<x>,<y>              the element under a point, with its ancestor chain — the honest answer
                          to "why did my click do nothing"
  rects:<sel>[,<sel>...]  box + position/z-index/pointer-events/display for each selector
  styles:<sel>=<prop>[,<prop>...]   specific computed properties
  toplayer:<sel>          whether the element matches :modal (really in the top layer)
  events:<x>,<y>          click there and report the capture-phase target of mousedown/click
  count:<sel>             how many match
  text:<sel>              its innerText, trimmed

always reported
  console errors/warnings and uncaught page errors, at the end

flags
  --url <url>       required
  --out <dir>       screenshot directory (default: ./probe-shots)
  --channel <name>  browser channel (default: chrome; pass "chromium" for the bundled one)
  --viewport <WxH>  default 1440x900
  --headless        run without a window (default: headed, so you can watch)
  --slow <ms>       slow each action down
`.trim()
  );
  process.exit(0);
}

const url = flag('url');
if (!url) {
  console.error('--url is required');
  process.exit(1);
}

const outDir = resolve(flag('out', 'probe-shots'));
mkdirSync(outDir, { recursive: true });
const [width, height] = flag('viewport', '1440x900').split('x').map(Number);

const browser = await chromium.launch({
  channel: flag('channel', 'chrome'),
  headless: has('headless'),
  slowMo: Number(flag('slow', '0')),
});
const page = await browser.newPage({ viewport: { width, height } });

const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    problems.push(`[${message.type()}] ${message.text()}`);
  }
});
page.on('pageerror', (error) => {
  problems.push(`[pageerror] ${error.message}`);
});

// ── The questions ───────────────────────────────────────────────────────────

/** Describe an element compactly enough to read a whole ancestor chain at a glance. */
const DESCRIBE = `(el) => {
  const box = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const name = el.tagName.toLowerCase()
    + (el.id ? '#' + el.id : '')
    + (el.getAttribute('data-testid') ? '[' + el.getAttribute('data-testid') + ']' : '')
    + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
  return name.slice(0, 90)
    + '  ' + Math.round(box.x) + ',' + Math.round(box.y)
    + ' ' + Math.round(box.width) + 'x' + Math.round(box.height)
    + '  pos=' + cs.position + ' z=' + cs.zIndex + ' pe=' + cs.pointerEvents + ' display=' + cs.display;
}`;

async function ask(question) {
  const [kind, rest = ''] = [
    question.slice(0, question.indexOf(':')),
    question.slice(question.indexOf(':') + 1),
  ];

  if (kind === 'at') {
    const [x, y] = rest.split(',').map(Number);
    const chain = await page.evaluate(
      ([px, py, describeSource]) => {
        const describe = new Function('return ' + describeSource)();
        const path = [];
        let node = document.elementFromPoint(px, py);
        if (!node) {
          return ['(nothing at that point — outside the viewport, or covered by nothing)'];
        }
        while (node) {
          path.push(describe(node));
          node = node.parentElement;
        }
        return path;
      },
      [x, y, DESCRIBE]
    );
    console.log(`at ${rest}:\n  ${chain.join('\n  ↑ ')}`);
    return;
  }

  if (kind === 'rects') {
    for (const selector of rest.split(',')) {
      const found = await page.evaluate(
        ([sel, describeSource]) => {
          const describe = new Function('return ' + describeSource)();
          const el = document.querySelector(sel);
          return el ? describe(el) : 'ABSENT';
        },
        [selector, DESCRIBE]
      );
      console.log(`rect ${selector}: ${found}`);
    }
    return;
  }

  if (kind === 'styles') {
    const [selector, props] = rest.split('=');
    const values = await page.evaluate(
      ([sel, names]) => {
        const el = document.querySelector(sel);
        if (!el) {
          return null;
        }
        const cs = getComputedStyle(el);
        return names.map((name) => {
          return `${name}=${cs.getPropertyValue(name)}`;
        });
      },
      [selector, (props ?? '').split(',')]
    );
    console.log(`styles ${selector}: ${values === null ? 'ABSENT' : values.join(' ')}`);
    return;
  }

  if (kind === 'toplayer') {
    const value = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) {
        return 'ABSENT';
      }
      return el.matches(':modal') ? 'yes (:modal)' : 'no — rendered inline, not in the top layer';
    }, rest);
    console.log(`toplayer ${rest}: ${value}`);
    return;
  }

  if (kind === 'events') {
    const [x, y] = rest.split(',').map(Number);
    const seen = [];
    const listener = (message) => {
      if (message.text().startsWith('dom-probe:')) {
        seen.push(message.text().replace('dom-probe:', '').trim());
      }
    };
    page.on('console', listener);
    await page.evaluate(
      ([describeSource]) => {
        const describe = new Function('return ' + describeSource)();
        for (const type of ['mousedown', 'mouseup', 'click']) {
          document.addEventListener(
            type,
            (event) => {
              console.log(`dom-probe: ${type} → ${describe(event.target)}`);
            },
            { capture: true, once: true }
          );
        }
      },
      [DESCRIBE]
    );
    await page.mouse.click(x, y);
    await page.waitForTimeout(200);
    page.off('console', listener);
    console.log(
      `events ${rest}:\n  ${seen.length === 0 ? '(no event reached the document)' : seen.join('\n  ')}`
    );
    return;
  }

  if (kind === 'count') {
    console.log(`count ${rest}: ${await page.locator(rest).count()}`);
    return;
  }

  if (kind === 'text') {
    const locator = page.locator(rest).first();
    const text = (await locator.count()) === 0 ? 'ABSENT' : (await locator.innerText()).trim();
    console.log(`text ${rest}: ${text.slice(0, 400)}`);
    return;
  }

  console.log(`(unknown question: ${question})`);
}

// ── The steps ───────────────────────────────────────────────────────────────

async function perform(step) {
  const separator = step.indexOf(':');
  const kind = separator === -1 ? step : step.slice(0, separator);
  const rest = separator === -1 ? '' : step.slice(separator + 1);

  if (kind === 'click') {
    await page.locator(rest).first().click();
    return;
  }
  if (kind === 'click-at') {
    const [x, y] = rest.split(',').map(Number);
    await page.mouse.click(x, y);
    return;
  }
  if (kind === 'key') {
    await page.keyboard.press(rest);
    return;
  }
  if (kind === 'fill') {
    const [selector, value] = rest.split('=');
    await page
      .locator(selector ?? '')
      .first()
      .fill(value ?? '');
    return;
  }
  if (kind === 'wait') {
    await page.waitForTimeout(Number(rest));
    return;
  }
  if (kind === 'settle') {
    // Poll the box rather than sleeping a guessed duration: an element mid-transition is smaller
    // and offset, so a coordinate probe fired too early answers a question nobody asked. This is
    // the single most common way a browser check lies.
    let previous = null;
    for (let i = 0; i < 60; i += 1) {
      const box = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) {
          return null;
        }
        const b = el.getBoundingClientRect();
        return `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)},${Math.round(b.height)}`;
      }, rest);
      if (box !== null && box === previous) {
        return;
      }
      previous = box;
      await page.waitForTimeout(50);
    }
    console.log(`settle ${rest}: still moving after 3s`);
    return;
  }
  if (kind === 'shot') {
    const path = `${outDir}/${rest || 'shot'}.png`;
    await page.screenshot({ path });
    console.log(`shot → ${path}`);
    return;
  }
  console.log(`(unknown step: ${step})`);
}

// ── Run ─────────────────────────────────────────────────────────────────────

await page.goto(url, { waitUntil: 'networkidle' });

for (const entry of timeline()) {
  if (entry.kind === 'do') {
    console.log(`· ${entry.value}`);
    await perform(entry.value);
  } else {
    await ask(entry.value);
  }
}

console.log(`\nconsole: ${problems.length === 0 ? 'clean' : ''}`);
for (const problem of problems) {
  console.log(`  ${problem}`);
}

await browser.close();
