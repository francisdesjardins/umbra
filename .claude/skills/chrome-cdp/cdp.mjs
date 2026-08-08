#!/usr/bin/env node
// Drive a real Chrome over the DevTools protocol: click, type, screenshot — and, the reason this
// exists, ask which CSS rule actually won a property and which ones lost to it.
//
// No dependencies. Node's global WebSocket speaks CDP directly, so this never has to agree with
// Playwright's version, and it can attach to a Chrome that is already open on the page in
// question instead of booting a clean one.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HELP = `
Usage: node .claude/skills/chrome-cdp/cdp.mjs [--attach|--launch <url>] [--do <step>]... [--probe <question>]...

Target
  --launch <url>       Start Chrome with remote debugging and open <url>
  --attach             Attach to a Chrome already listening (default)
  --port <n>           Debugging port (default 9222)
  --match <text>       Pick the tab whose URL or title contains <text> (default: the first page)
  --list               Print the open tabs and exit

Steps (--do), run in the order given, interleaved with probes
  click:<sel>          Hit-test the centre, then click (errors if something covers it)
  click-at:<x>,<y>     Click viewport coordinates
  key:<Key>            Press a key — Enter, Escape, Tab, ArrowDown, a
  fill:<sel>=<text>    Focus the element and type
  eval:<js>            Evaluate an expression in the page, print the result
  wait:<ms>            Pause
  settle:<sel>         Wait until the element's box stops changing
  nav:<url>            Navigate
  viewport:<W>x<H>     Emulate a layout viewport — what a media query actually reads
  shot:<name>          Screenshot into --out
  shot:<name>@<sel>    Screenshot just that element

Questions (--probe)
  css:<sel>[=prop,..]  Every rule that matches, in cascade order, with the losers marked.
                       This is the one dom-probe cannot answer.
  computed:<sel>=<p,..> Computed values
  box:<sel>            Box model, in viewport coordinates
  text:<sel>           innerText, so a multi-line panel stays multi-line
  count:<sel>          How many match
  at:<x>,<y>           What is under a point, with its ancestor chain

Flags
  --chrome <path>      Chrome binary, when the usual locations miss
  --out <dir>          Screenshot directory (default ./probe-shots)
  --quiet              Suppress the console-message dump
`;

// ── argv ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.length === 0) {
  process.stdout.write(HELP);
  process.exit(0);
}
const script = [];
let port = 9222;
let match = null;
let out = './probe-shots';
let launchUrl = null;
let chromePath = null;
let list = false;
let quiet = false;

for (let i = 0; i < argv.length; i++) {
  const flag = argv[i];
  const value = argv[i + 1];
  if (flag === '--do' || flag === '--probe') {
    script.push({ kind: flag.slice(2), text: value });
    i++;
  } else if (flag === '--port') {
    port = Number(value);
    i++;
  } else if (flag === '--match') {
    match = value;
    i++;
  } else if (flag === '--out') {
    out = value;
    i++;
  } else if (flag === '--launch') {
    launchUrl = value;
    i++;
  } else if (flag === '--chrome') {
    chromePath = value;
    i++;
  } else if (flag === '--list') {
    list = true;
  } else if (flag === '--quiet') {
    quiet = true;
  } else if (flag === '--attach') {
    // default
  } else {
    fail(`unknown flag: ${flag}`);
  }
}

function fail(message) {
  process.stderr.write(`cdp: ${message}\n`);
  process.exit(2);
}

const sleep = (ms) => {
  return new Promise((r) => {
    return setTimeout(r, ms);
  });
};

// ── target discovery ─────────────────────────────────────────────────────────
async function targets() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  return response.json();
}

async function waitForChrome(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await targets();
    } catch {
      if (Date.now() > deadline) {
        fail(
          `nothing is listening on ${port}. Start Chrome with --remote-debugging-port=${port}, or pass --launch <url>.`
        );
      }
      await sleep(250);
    }
  }
}

// Where Chrome actually is, in the order worth trying. `--chrome <path>` overrides all of it;
// hard-coding one path is how this failed the first time it ran on a machine with the 32-bit
// installer, which is the common Windows layout.
const CHROME_CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env['LOCALAPPDATA'] ?? ''}/Google/Chrome/Application/chrome.exe`,
    `${process.env['LOCALAPPDATA'] ?? ''}/ms-playwright/chromium-1234/chrome-win64/chrome.exe`,
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'],
};

if (launchUrl) {
  const binary =
    chromePath ??
    (CHROME_CANDIDATES[process.platform] ?? []).find((candidate) => {
      return existsSync(candidate);
    });
  if (!binary) {
    fail(
      'no Chrome found — pass --chrome <path>, or start one yourself with --remote-debugging-port.'
    );
  }
  // A throwaway profile, keyed by port: a Chrome already running on a given profile ignores the
  // debugging flag and hands the URL to the existing process — so a second `--launch` on another
  // port would silently attach nothing. That is the commonest way this appears broken.
  const profile = resolve(out, `.chrome-cdp-profile-${port}`);
  mkdirSync(profile, { recursive: true });
  const child = spawn(
    binary,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', launchUrl],
    {
      detached: true,
      stdio: 'ignore',
    }
  );
  child.on('error', (error) => {
    fail(`could not start ${binary}: ${error.message}`);
  });
  child.unref();
}

const found = await waitForChrome();
const pages = found.filter((t) => {
  return t.type === 'page';
});

if (list) {
  for (const p of pages) {
    process.stdout.write(`${p.title}\n  ${p.url}\n`);
  }
  process.exit(0);
}

const target =
  (match
    ? pages.find((p) => {
        return p.url.includes(match) || p.title.includes(match);
      })
    : pages[0]) ?? null;
if (!target) {
  fail(match ? `no open tab matches "${match}". Try --list.` : 'no page target is open.');
}

// ── the connection ───────────────────────────────────────────────────────────
const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
const consoleLines = [];
let nextId = 1;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== undefined) {
    const slot = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      slot.reject(new Error(`${slot.method}: ${message.error.message}`));
    } else {
      slot.resolve(message.result);
    }
    return;
  }
  if (
    message.method === 'Runtime.consoleAPICalled' &&
    ['error', 'warning'].includes(message.params.type)
  ) {
    consoleLines.push(
      `[${message.params.type}] ${message.params.args
        .map((a) => {
          return a.value ?? a.description ?? a.type;
        })
        .join(' ')}`
    );
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleLines.push(`[pageerror] ${message.params.exceptionDetails.text}`);
  }
});

await new Promise((done, no) => {
  socket.addEventListener('open', done, { once: true });
  socket.addEventListener(
    'error',
    () => {
      return no(new Error('could not open the CDP socket'));
    },
    { once: true }
  );
});

function send(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve_, reject) => {
    pending.set(id, { resolve: resolve_, reject, method });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

await send('DOM.enable');
await send('CSS.enable');
await send('Page.enable');
await send('Runtime.enable');

// ── element addressing ───────────────────────────────────────────────────────
// DOM.querySelector needs a document nodeId, and the document is re-issued on navigation, so
// it is fetched per lookup rather than cached into a stale handle.
async function nodeIdFor(selector) {
  const { root } = await send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) {
    throw new Error(`no element matches ${selector}`);
  }
  return nodeId;
}

async function centreOf(selector) {
  const nodeId = await nodeIdFor(selector);
  const { model } = await send('DOM.getBoxModel', { nodeId });
  const [x1, y1, x2, , , y3] = model.border;
  return { x: (x1 + x2) / 2, y: (y1 + y3) / 2, nodeId, model };
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(exceptionDetails.text ?? 'evaluation failed');
  }
  return result.value;
}

const quote = (s) => {
  return JSON.stringify(s);
};

// ── steps ────────────────────────────────────────────────────────────────────
/**
 * Click an element, and say so if something is on top of it.
 *
 * Not synthetic input: `Input.dispatchMouseEvent` delivers `mouseMoved` reliably here but drops
 * `mousePressed`/`mouseReleased` often enough that a silent listener means nothing — the box,
 * the coordinates and the hit test all read correct while no event ever arrives, which is the
 * worst possible failure for a diagnostic tool. So the hit test is done explicitly and the
 * click is dispatched in the page, where it either happens or throws. `dom-probe` drives real
 * input through Playwright; reach for that when the input path itself is the question.
 */
async function clickSelector(selector) {
  const { x, y } = await centreOf(selector);
  const blocker = await evaluate(`(() => {
    const el = document.querySelector(${quote(selector)});
    const top = document.elementFromPoint(${x}, ${y});
    if (top && top !== el && !el.contains(top)) {
      return top.tagName.toLowerCase() + (top.id ? '#' + top.id : '');
    }
    el.click();
    return null;
  })()`);
  if (blocker !== null) {
    throw new Error(`${blocker} covers the centre of ${selector} — nothing was clicked`);
  }
  await sleep(80);
}

// Kept for `click-at:<x>,<y>`, where coordinates are the whole point. Move, press, release —
// `buttons` must go back to 0 on the release or Chrome does not synthesise the `click`.
async function clickAt(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x,
    y,
    button: 'left',
    clickCount: 1,
    buttons: 1,
  });
  await send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x,
    y,
    button: 'left',
    clickCount: 1,
    buttons: 0,
  });
  await sleep(80);
}

const KEY_CODES = {
  Enter: { windowsVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r' },
  Escape: { windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' },
  Tab: { windowsVirtualKeyCode: 9, key: 'Tab', code: 'Tab' },
  ArrowDown: { windowsVirtualKeyCode: 40, key: 'ArrowDown', code: 'ArrowDown' },
  ArrowUp: { windowsVirtualKeyCode: 38, key: 'ArrowUp', code: 'ArrowUp' },
  Space: { windowsVirtualKeyCode: 32, key: ' ', code: 'Space', text: ' ' },
};

async function pressKey(name) {
  const spec = KEY_CODES[name] ?? { key: name, code: `Key${name.toUpperCase()}`, text: name };
  await send('Input.dispatchKeyEvent', { type: 'keyDown', ...spec });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', ...spec, text: undefined });
  await sleep(60);
}

async function runStep(text) {
  const colon = text.indexOf(':');
  const verb = colon === -1 ? text : text.slice(0, colon);
  const rest = colon === -1 ? '' : text.slice(colon + 1);
  process.stdout.write(`· ${text}\n`);

  if (verb === 'click') {
    await clickSelector(rest);
  } else if (verb === 'click-at') {
    const [x, y] = rest.split(',').map(Number);
    await clickAt(x, y);
  } else if (verb === 'key') {
    await pressKey(rest);
  } else if (verb === 'fill') {
    const eq = rest.indexOf('=');
    const selector = rest.slice(0, eq);
    const value = rest.slice(eq + 1);
    // Set through the property and fire the events a framework listens for; `Input.insertText`
    // alone leaves React's value tracker convinced nothing changed.
    await evaluate(`(() => {
      const el = document.querySelector(${quote(selector)});
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, ${quote(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await sleep(60);
  } else if (verb === 'eval') {
    process.stdout.write(`  → ${JSON.stringify(await evaluate(rest))}\n`);
  } else if (verb === 'wait') {
    await sleep(Number(rest));
  } else if (verb === 'nav') {
    await send('Page.navigate', { url: rest });
    await sleep(1200);
  } else if (verb === 'settle') {
    let previous = '';
    for (let i = 0; i < 40; i++) {
      const now = await evaluate(
        `JSON.stringify(document.querySelector(${quote(rest)})?.getBoundingClientRect() ?? null)`
      );
      if (now && now === previous) {
        return;
      }
      previous = now;
      await sleep(50);
    }
  } else if (verb === 'shot') {
    const [name, selector] = rest.split('@');
    mkdirSync(out, { recursive: true });
    const params = { format: 'png' };
    if (selector) {
      const { model } = await centreOf(selector);
      const [x1, y1, x2, , , y3] = model.border;
      params.clip = { x: x1, y: y1, width: x2 - x1, height: y3 - y1, scale: 1 };
    }
    const { data } = await send('Page.captureScreenshot', params);
    const file = resolve(out, `${name}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    process.stdout.write(`  shot → ${file}\n`);
  } else if (verb === 'viewport') {
    // Emulation rather than a resized window: it reaches the actual layout viewport, which is
    // what a media query reads, and it works on a window the OS will not let you shrink.
    const [width, height] = rest.split('x').map(Number);
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(200);
  } else {
    fail(`unknown step: ${text}`);
  }
}

// ── the CSS question ─────────────────────────────────────────────────────────
// `CSS.getMatchedStylesForNode` hands back every rule that matches, in increasing cascade order,
// plus the element's inline style. Walking it backwards names the declaration that won each
// property — which is the answer a computed value cannot give you, because a computed value
// looks the same whether your rule produced it or something outranked you.
async function reportCss(selector, only) {
  const nodeId = await nodeIdFor(selector);
  const matched = await send('CSS.getMatchedStylesForNode', { nodeId });
  const wanted = only ? new Set(only) : null;

  const layers = [];
  for (const entry of matched.matchedCSSRules ?? []) {
    const rule = entry.rule;
    const sheet =
      rule.origin === 'user-agent' ? 'user agent' : rule.styleSheetId ? 'stylesheet' : rule.origin;
    layers.push({
      label: `${rule.selectorList.text}   [${sheet}]`,
      properties: rule.style.cssProperties ?? [],
    });
  }
  // Inline last: it outranks every rule above unless one of them is `!important`.
  if (matched.inlineStyle) {
    layers.push({
      label: 'element style attribute (inline)',
      properties: matched.inlineStyle.cssProperties ?? [],
    });
  }

  const isImportant = (p) => {
    return /!\s*important/.test(p.text ?? '');
  };
  const winners = new Map();
  layers.forEach((layer, index) => {
    for (const property of layer.properties) {
      if (!property.name || property.disabled) {
        continue;
      }
      const held = winners.get(property.name);
      if (!held || isImportant(property) || !isImportant(held.property)) {
        winners.set(property.name, { index, property });
      }
    }
  });

  process.stdout.write(`css ${selector}: ${layers.length} layer(s), lowest priority first\n`);
  layers.forEach((layer, index) => {
    const shown = layer.properties.filter((p) => {
      return p.name && !p.name.startsWith('--') && (!wanted || wanted.has(p.name));
    });
    if (shown.length === 0) {
      return;
    }
    process.stdout.write(`  ${layer.label}\n`);
    for (const property of shown) {
      const won = winners.get(property.name)?.index === index;
      const by = won
        ? ''
        : `  ✗ lost to ${layers[winners.get(property.name).index].label.split('   ')[0]}`;
      process.stdout.write(`    ${won ? '✓' : ' '} ${property.name}: ${property.value}${by}\n`);
    }
  });
}

async function reportComputed(selector, props) {
  const nodeId = await nodeIdFor(selector);
  const { computedStyle } = await send('CSS.getComputedStyleForNode', { nodeId });
  const wanted = new Set(props);
  const shown = computedStyle
    .filter((p) => {
      return wanted.has(p.name);
    })
    .map((p) => {
      return `${p.name}=${p.value}`;
    });
  process.stdout.write(`computed ${selector}: ${shown.join(' ')}\n`);
}

async function runProbe(text) {
  const colon = text.indexOf(':');
  const verb = text.slice(0, colon);
  const rest = text.slice(colon + 1);

  if (verb === 'css') {
    // Split on the LAST `=` so a selector may contain one: dialog[data-modal-id='x']=background
    const eq = rest.lastIndexOf('=');
    const hasProps = eq !== -1 && !rest.slice(eq).includes(']');
    await reportCss(
      hasProps ? rest.slice(0, eq) : rest,
      hasProps ? rest.slice(eq + 1).split(',') : null
    );
  } else if (verb === 'computed') {
    const eq = rest.lastIndexOf('=');
    await reportComputed(rest.slice(0, eq), rest.slice(eq + 1).split(','));
  } else if (verb === 'box') {
    const { model } = await centreOf(rest);
    const [x1, y1, x2, , , y3] = model.border;
    process.stdout.write(`box ${rest}: ${x1},${y1} ${x2 - x1}x${y3 - y1}\n`);
  } else if (verb === 'text') {
    // `innerText`, not `textContent`: a log panel is a stack of divs, and textContent runs them
    // together into one line that reads as though half the events never happened.
    process.stdout.write(
      `text ${rest}:\n${await evaluate(`document.querySelector(${quote(rest)})?.innerText?.trim() ?? null`)}\n`
    );
  } else if (verb === 'count') {
    process.stdout.write(
      `count ${rest}: ${await evaluate(`document.querySelectorAll(${quote(rest)}).length`)}\n`
    );
  } else if (verb === 'at') {
    const [x, y] = rest.split(',').map(Number);
    const chain = await evaluate(`(() => {
      let el = document.elementFromPoint(${x}, ${y});
      const out = [];
      while (el) {
        out.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
          (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''));
        el = el.parentElement;
      }
      return out;
    })()`);
    process.stdout.write(`at ${x},${y}: ${chain.join(' ‹ ')}\n`);
  } else {
    fail(`unknown probe: ${text}`);
  }
}

// ── run ──────────────────────────────────────────────────────────────────────
let failed = false;
for (const item of script) {
  try {
    if (item.kind === 'do') {
      await runStep(item.text);
    } else {
      await runProbe(item.text);
    }
  } catch (error) {
    failed = true;
    process.stdout.write(`  ! ${item.kind} ${item.text} — ${error.message}\n`);
  }
}

if (!quiet) {
  process.stdout.write(`\nconsole: ${consoleLines.length === 0 ? 'clean' : ''}\n`);
  for (const line of consoleLines) {
    process.stdout.write(`  ${line}\n`);
  }
}

socket.close();
process.exit(failed ? 1 : 0);
