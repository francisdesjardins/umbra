#!/usr/bin/env node
// Measure WCAG 2.2 AA contrast and focus visibility against a real Chrome, on the page as it
// actually renders — not against the values a stylesheet says it wants.
//
// The distinction matters because the two commonest ways a palette fails AA are invisible to
// source review: `rgba()` text is composited over whatever is behind it, and an ancestor's
// `opacity` multiplies a ratio that was measured without it. Both read as a perfectly good
// hex pair in the source and as grey mush on a cheap panel.
//
// No dependencies — Node's global WebSocket speaks CDP directly, the same way `chrome-cdp` does.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const HELP = `
Usage: node .claude/skills/wcag-audit/audit.mjs --base <url> [options]

Target
  --base <url>         Origin to audit (default http://localhost:3000)
  --route <path>       Route to visit; repeatable (default "/")
  --crawl <selector>   Harvest same-origin hrefs from this selector on the first route
  --scheme <name>      light | dark; repeatable (default: both)
  --viewport <WxH>     Emulate a phone-sized viewport, e.g. 390x844 or 320x640; repeatable.
                       Turns on 1.4.10 Reflow and 2.5.8 Target Size, which only bite there.
  --launch             Start a throwaway Chrome instead of attaching to one
  --attach             Use a Chrome already listening (default)
  --port <n>           Debugging port (default 9222)
  --chrome <path>      Chrome binary, when the usual locations miss

What to measure
  --open <selector>    Click this on each route, scan what it opened, then Escape; repeatable
  --then <step>        Inside the open dialog, click this and scan again; repeatable, in order.
                       A CSS selector, or "text:Delete" to match a button by its visible label —
                       which is how you reach an error banner or a busy state.
  --focus              Also tab through every focusable element and report invisible focus
  --no-non-text        Skip the 1.4.11 pass over control boundaries and icons
  --min <n>            Override the normal-text threshold (default 4.5)

Output
  --json <file>        Write the full findings as JSON
  --quiet              Only the summary and the failures
`;

const argv = process.argv.slice(2);
if (argv.includes('--help')) {
  process.stdout.write(HELP);
  process.exit(0);
}

const opt = {
  base: 'http://localhost:3000',
  routes: [],
  schemes: [],
  viewports: [],
  opens: [],
  thens: [],
  crawl: null,
  launch: false,
  port: 9222,
  chrome: null,
  focus: false,
  nonText: true,
  min: 4.5,
  json: null,
  quiet: false,
};

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => {
    i += 1;
    return argv[i];
  };
  if (a === '--base') opt.base = next().replace(/\/$/, '');
  else if (a === '--route') opt.routes.push(next());
  else if (a === '--scheme') opt.schemes.push(next());
  else if (a === '--viewport') opt.viewports.push(next());
  else if (a === '--open') opt.opens.push(next());
  else if (a === '--then') opt.thens.push(next());
  else if (a === '--crawl') opt.crawl = next();
  else if (a === '--launch') opt.launch = true;
  else if (a === '--attach') opt.launch = false;
  else if (a === '--port') opt.port = Number(next());
  else if (a === '--chrome') opt.chrome = next();
  else if (a === '--focus') opt.focus = true;
  else if (a === '--no-non-text') opt.nonText = false;
  else if (a === '--min') opt.min = Number(next());
  else if (a === '--json') opt.json = next();
  else if (a === '--quiet') opt.quiet = true;
  else {
    process.stderr.write(`wcag-audit: unknown flag ${a}\n${HELP}`);
    process.exit(2);
  }
}
if (opt.routes.length === 0) opt.routes.push('/');
if (opt.schemes.length === 0) opt.schemes.push('light', 'dark');

const fail = (message) => {
  process.stderr.write(`wcag-audit: ${message}\n`);
  process.exit(2);
};

const sleep = (ms) => {
  return new Promise((r) => {
    return setTimeout(r, ms);
  });
};

// ── the page-side scanner ────────────────────────────────────────────────────
// Serialized with `toString()` and evaluated in the page, so it must not close over anything.

function SCANNER() {
  const parse = (input) => {
    const s = String(input || '').trim();
    const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4)
        h = h
          .split('')
          .map((c) => c + c)
          .join('');
      const n = parseInt(h.slice(0, 6), 16);
      return [
        (n >> 16) & 255,
        (n >> 8) & 255,
        n & 255,
        h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      ];
    }
    const fn = /^rgba?\(([^)]+)\)$/i.exec(s);
    if (fn) {
      const p = fn[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    return null;
  };

  const over = (fg, bg) => {
    const a = fg[3];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1,
    ];
  };

  const lum = (c) => {
    const ch = (v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(c[0]) + 0.7152 * ch(c[1]) + 0.0722 * ch(c[2]);
  };

  const ratio = (a, b) => {
    const la = lum(a);
    const lb = lum(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  };

  const hex = (c) => {
    const h = (v) => {
      return Math.round(v).toString(16).padStart(2, '0');
    };
    return '#' + h(c[0]) + h(c[1]) + h(c[2]);
  };

  /**
   * The ancestor chain, with the running product of `opacity` from each element up to the root.
   *
   * `opacity` never appears in a computed `color`, so a ratio measured without it is the ratio
   * of a pixel the user never sees. Applying the product to both the text and every background
   * layer is an approximation of group compositing — exact whenever the group is opaque behind,
   * which is the case that actually occurs.
   */
  const chainOf = (el) => {
    const chain = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) chain.push(n);
    const styles = chain.map((n) => {
      return getComputedStyle(n);
    });
    const opacity = [];
    let running = 1;
    for (let i = chain.length - 1; i >= 0; i--) {
      const v = parseFloat(styles[i].opacity);
      running *= Number.isNaN(v) ? 1 : v;
      opacity[i] = running;
    }
    return { chain, styles, opacity };
  };

  /**
   * The colour actually behind the text: every painted layer from the element up, folded.
   *
   * Collected front-to-back and folded back-to-front, because compositing only reads correctly
   * in that direction — and collection stops at the first opaque layer, since nothing behind an
   * opaque background contributes a pixel.
   */
  const backdrop = (chain, styles, opacity) => {
    const layers = [];
    for (let i = 0; i < chain.length; i++) {
      const st = styles[i];
      // A gradient or an image cannot be reduced to one colour; say so rather than guess.
      if (st.backgroundImage && st.backgroundImage !== 'none') return { unmeasurable: true };
      const c = parse(st.backgroundColor);
      if (!c || c[3] === 0) continue;
      const layer = [c[0], c[1], c[2], c[3] * opacity[i]];
      layers.push(layer);
      if (layer[3] >= 0.999) break;
    }
    /**
     * What shows through when nothing up the chain is opaque.
     *
     * Inside an open dialog that is the **`::backdrop`**, and it has to be asked for by name: a
     * pseudo-element is not an ancestor, so walking `parentElement` sails straight past it to the
     * page behind. A panel that brings no surface of its own — this library ships none, so that
     * is the normal case — then measures its pale text against a white page and reports about
     * 1.2:1 for something perfectly readable on the dark backdrop actually behind it.
     */
    const dialog = chain[0]?.closest?.('dialog[open]');
    if (dialog) {
      const back = getComputedStyle(dialog, '::backdrop');
      // A restyled backdrop is usually a gradient stack; say so rather than reduce it to a colour.
      if (back.backgroundImage && back.backgroundImage !== 'none') return { unmeasurable: true };
      const c = parse(back.backgroundColor);
      if (c && c[3] > 0) {
        let result = c[3] >= 0.999 ? [c[0], c[1], c[2], 1] : over(c, [255, 255, 255, 1]);
        for (let i = layers.length - 1; i >= 0; i--) result = over(layers[i], result);
        return { color: result };
      }
    }

    const canvas = parse(getComputedStyle(document.documentElement).backgroundColor);
    let result = canvas && canvas[3] > 0.999 ? canvas : [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) result = over(layers[i], result);
    return { color: result };
  };

  const label = (el) => {
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return (
      el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (cls.length ? '.' + cls.join('.') : '')
    );
  };

  const path = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 4; n = n.parentElement) {
      parts.unshift(label(n));
    }
    return parts.join(' > ');
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.visibility === 'visible' && parseFloat(st.opacity) > 0.05;
  };

  const results = {
    text: [],
    nonText: [],
    targets: [],
    clipped: [],
    reflow: null,
    unmeasurable: 0,
  };

  // ── 1.4.3 text contrast ────────────────────────────────────────────────────
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'noscript') continue;
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3 && node.nodeValue.trim()) text += node.nodeValue.trim() + ' ';
    }
    text = text.trim();
    if (!text || !visible(el)) continue;

    const { chain, styles, opacity } = chainOf(el);
    // Faded out by an ancestor — a closing dialog, a hidden template preview. 1.4.3 exempts text
    // that is not visible, and measuring it anyway is not merely out of scope: at a cumulative
    // opacity of zero the text composites to exactly its own backdrop and reports a perfect 1:1,
    // which is how this first appeared — five invented failures inside a panel nobody can see.
    if (opacity[0] <= 0.05) continue;

    const st = styles[0];
    const back = backdrop(chain, styles, opacity);
    if (back.unmeasurable) {
      results.unmeasurable += 1;
      continue;
    }
    const raw = parse(
      st.webkitTextFillColor && st.webkitTextFillColor !== st.color
        ? st.webkitTextFillColor
        : st.color
    );
    if (!raw) continue;
    const fg = over([raw[0], raw[1], raw[2], raw[3] * opacity[0]], back.color);

    const size = parseFloat(st.fontSize);
    const weight = Number(st.fontWeight) || (st.fontWeight === 'bold' ? 700 : 400);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : Number(REQUIRED_NORMAL);
    const r = ratio(fg, back.color);
    if (r >= required) continue;

    // 1.4.3 exempts text in an inactive control, and decoration that conveys nothing.
    const disabled = !!el.closest('[disabled],[aria-disabled="true"]');
    results.text.push({
      ratio: r,
      required,
      fg: hex(fg),
      bg: hex(back.color),
      size: Math.round(size * 10) / 10,
      weight,
      large,
      disabled,
      hidden: !!el.closest('[aria-hidden="true"]'),
      sample: text.slice(0, 70),
      path: path(el),
    });
  }

  // ── 1.4.11 non-text: control boundaries and icons ──────────────────────────
  if (NON_TEXT) {
    const controls = document.querySelectorAll('input, select, textarea, svg');
    for (const el of controls) {
      if (!visible(el)) continue;
      const { chain, styles, opacity } = chainOf(el);
      if (opacity[0] <= 0.05) continue;
      const st = styles[0];
      const back = backdrop(chain.slice(1), styles.slice(1), opacity.slice(1));
      if (back.unmeasurable) continue;

      if (el.tagName.toLowerCase() === 'svg') {
        // An icon that carries meaning needs 3:1; a decorative one is exempt, and the honest
        // marker for that is `aria-hidden`, which the caller has either set or not.
        if (el.closest('[aria-hidden="true"]') || el.getAttribute('aria-hidden') === 'true')
          continue;
        const raw = parse(st.color);
        if (!raw) continue;
        const fg = over([raw[0], raw[1], raw[2], raw[3] * opacity[0]], back.color);
        const r = ratio(fg, back.color);
        if (r < 3)
          results.nonText.push({
            kind: 'icon',
            ratio: r,
            required: 3,
            fg: hex(fg),
            bg: hex(back.color),
            path: path(el),
          });
        continue;
      }

      const width = parseFloat(st.borderTopWidth);
      if (!width) continue;
      const raw = parse(st.borderTopColor);
      if (!raw || raw[3] === 0) continue;
      const edge = over([raw[0], raw[1], raw[2], raw[3] * opacity[0]], back.color);
      const r = ratio(edge, back.color);
      if (r < 3)
        results.nonText.push({
          kind: 'control boundary',
          ratio: r,
          required: 3,
          fg: hex(edge),
          bg: hex(back.color),
          path: path(el),
        });
    }
  }

  // ── 2.5.8 Target Size (Minimum) — WCAG 2.2 AA, 24×24 CSS px ────────────────
  // The exceptions are real and applied here: a link inline in a sentence is exempt (its size is
  // the text's), and so is anything the user agent draws. What is left is the case that matters
  // on a phone — a control small enough to be a coin toss under a thumb.
  const INTERACTIVE = 'a[href], button, [role="button"], input, select, summary, [tabindex="0"]';
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!visible(el)) continue;
    const { opacity } = chainOf(el);
    if (opacity[0] <= 0.05) continue;
    // The target is what a pointer may hit, and for a checkbox or radio wrapped in a label that
    // is the whole label — clicking it toggles the input. Measuring the box alone reports a
    // failure for a control whose real target is a comfortable row, and pushes the fix toward
    // inflating the box, which is how a native checkbox ends up twice the weight of the one in
    // the component library beside it.
    const label = el.closest('label');
    const box = label ?? el;
    const r = box.getBoundingClientRect();
    if (r.width >= 24 && r.height >= 24) continue;

    // Inline in a run of text: the exception exists because sizing it would break the sentence.
    if (el.tagName === 'A') {
      const parent = el.parentElement;
      const inline = parent && (parent.textContent || '').trim() !== (el.textContent || '').trim();
      if (inline) continue;
    }
    results.targets.push({
      w: Math.round(r.width),
      h: Math.round(r.height),
      sample: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
      path: path(el),
    });
  }

  /**
   * Content cut off by its own dialog.
   *
   * Measured against the **dialog's** box, not the viewport, and that distinction is the whole
   * check: the UA caps a `<dialog>` at `calc(100% - 6px - 2em)` — 337px on a 375px phone — so a
   * panel sized `min(600px, 92vw)` asks for 345 and is clipped by eight pixels, losing its right
   * rounded corner. Nothing passes the viewport, the document never scrolls sideways, and a
   * reflow check comparing to `innerWidth` reports a clean page while the modal is visibly cut.
   * Four panels here were wrong this way and the viewport-relative pass called all four fine.
   */
  for (const dialog of document.querySelectorAll('dialog[open]')) {
    const dr = dialog.getBoundingClientRect();
    if (!dr.width) continue;
    for (const el of dialog.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const st = getComputedStyle(el);
      // Only boxes that paint an edge; a text node reaching past is a wrapping question.
      if (st.backgroundColor === 'rgba(0, 0, 0, 0)' && parseFloat(st.borderTopWidth) === 0)
        continue;
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue;
      const over = Math.round(Math.max(r.right - dr.right, dr.left - r.left));
      if (over > 1)
        results.clipped.push({
          over,
          width: st.width,
          radius: st.borderRadius,
          path: path(el),
          dialogWidth: Math.round(dr.width),
        });
    }
  }

  // ── 1.4.10 Reflow — no two-dimensional scrolling down to 320 CSS px ────────
  const doc = document.documentElement;
  if (doc.scrollWidth > window.innerWidth + 1) {
    // Name what is actually sticking out, or the finding is unactionable.
    const culprits = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= window.innerWidth + 1) continue;
      const st = getComputedStyle(el);
      // A container that scrolls its own overflow is the sanctioned answer, not a violation.
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue;
      if (el.closest('[style*="overflow"], pre, code')) continue;
      culprits.push({ path: path(el), right: Math.round(r.right) });
    }
    results.reflow = {
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      culprits: culprits.slice(0, 6),
    };
  }

  return results;
}

/**
 * Snapshot every focusable element while it is **not** focused, so a real Tab walk has a baseline.
 *
 * Focus has to arrive by a real key press to be measured honestly, and that rules out the obvious
 * implementation. A programmatic `focus()` does not put Chrome in keyboard modality, so nothing
 * matches `:focus-visible` and every button on the page reports as bare. Sending one real Tab
 * first fixes that much — but a component library that marks focus with a **class** its own
 * listener adds (MUI's `.Mui-focusVisible`) still never gets the class, and reports bare a second
 * time for a different reason. Both were measured here, not assumed.
 *
 * So: index the elements, record their resting appearance, and let the driver Tab through for real.
 */
function FOCUS_BASELINE() {
  const FOCUSABLE =
    'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), summary';
  window.__wcagFocus = { base: new Map(), props: null };
  let index = 0;
  for (const el of document.querySelectorAll(FOCUSABLE)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.hasAttribute('disabled')) continue;
    el.setAttribute('data-wcag-focus-index', String(index));
    index += 1;
  }
  return index;
}

/** Read whatever currently has focus, against the resting appearance recorded above. */
function FOCUS_PROBE() {
  const PROPS = [
    ['outline', (s) => s.outlineStyle + ' ' + s.outlineWidth + ' ' + s.outlineColor],
    ['box-shadow', (s) => s.boxShadow],
    ['border', (s) => s.borderColor + ' ' + s.borderWidth],
    ['background', (s) => s.backgroundColor],
    ['text', (s) => s.color + ' ' + s.textDecorationLine],
  ];
  const read = (el) => {
    const s = getComputedStyle(el);
    return PROPS.map(([, get]) => {
      return get(s);
    });
  };
  const label = (el) => {
    const cls = (el.getAttribute('class') || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((c) => {
        return !c.startsWith('css-');
      })
      .slice(0, 2);
    return (
      el.tagName.toLowerCase() +
      (el.id ? '#' + el.id : '') +
      (cls.length ? '.' + cls.join('.') : '')
    );
  };

  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const index = el.getAttribute('data-wcag-focus-index');
  if (index === null) return null;

  const focused = read(el);
  // The resting appearance: read from a clone that is in the tree but not focused. Blurring the
  // real element to measure it would move focus and break the walk.
  const twin = el.cloneNode(true);
  twin.removeAttribute('data-wcag-focus-index');
  twin.removeAttribute('id');
  twin.classList.remove('Mui-focusVisible');
  twin.style.position = 'absolute';
  twin.style.left = '-99999px';
  el.parentElement.appendChild(twin);
  const resting = read(twin);
  twin.remove();

  const changed = PROPS.filter((_, i) => {
    return resting[i] !== focused[i];
  }).map(([name]) => {
    return name;
  });

  /**
   * A ring drawn outside the element is only there if nothing clips it.
   *
   * `outline-offset` puts the ring past the element's border box, and any ancestor that is not
   * `overflow: visible` clips at its own padding box — so a control sitting flush against the
   * edge of a bounded container (a modal footer, a scroll area) loses the side of the ring that
   * reaches the edge. It looks like a rendering glitch and it is a real loss of the indicator.
   */
  const st = getComputedStyle(el);
  const need = (parseFloat(st.outlineWidth) || 0) + (parseFloat(st.outlineOffset) || 0);
  const clipped = [];
  if (need > 0 && st.outlineStyle !== 'none') {
    const box = el.getBoundingClientRect();
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      // The walk stops at an open dialog. `showModal()` promotes it to the top layer, where it is
      // painted outside its DOM ancestors' boxes and none of their `overflow` applies — so
      // continuing up reports the card the dialog happens to be declared inside as a clipper,
      // which is how this first read: a real clip on the modal footer, and a phantom above it.
      if (n.tagName === 'DIALOG' && n.hasAttribute('open')) break;
      const s = getComputedStyle(n);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const r = n.getBoundingClientRect();
      const sides = [];
      if (box.top - need < r.top - 0.5) sides.push('top');
      if (box.left - need < r.left - 0.5) sides.push('left');
      if (box.right + need > r.right + 0.5) sides.push('right');
      if (box.bottom + need > r.bottom + 0.5) sides.push('bottom');
      if (sides.length) clipped.push(`${label(n)} clips ${sides.join('/')}`);
    }
  }

  return {
    index: Number(index),
    path: label(el),
    sample: (el.textContent || '').trim().slice(0, 50),
    indicator: changed.length === 0 ? 'none' : changed.join('+'),
    clipped,
    // Only the shape-changing ones read as a ring; a tint or a colour swap is the weak case.
    strong: changed.some((n) => {
      return n === 'outline' || n === 'box-shadow' || n === 'border';
    }),
  };
}

// ── connection ───────────────────────────────────────────────────────────────
const targets = async () => {
  const response = await fetch(`http://127.0.0.1:${opt.port}/json/list`);
  return response.json();
};

const waitForChrome = async (timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await targets();
    } catch {
      if (Date.now() > deadline)
        fail(
          `nothing is listening on ${opt.port}. Start Chrome with --remote-debugging-port=${opt.port}, or pass --launch.`
        );
      await sleep(250);
    }
  }
};

const CHROME_CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env['LOCALAPPDATA'] ?? ''}/Google/Chrome/Application/chrome.exe`,
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'],
};

if (opt.launch) {
  const binary =
    opt.chrome ??
    (CHROME_CANDIDATES[process.platform] ?? []).find((c) => {
      return existsSync(c);
    });
  if (!binary) fail('no Chrome found — pass --chrome <path>, or start one with debugging on.');
  // A throwaway profile: a Chrome already running on the normal one ignores the debugging flag
  // and just hands it the URL, which is the commonest way this looks broken.
  //
  // In the OS temp directory, never under the repo. A Chrome profile brings a few thousand
  // extension files with it, and dropping those in the working tree puts them in front of every
  // linter and file-walker in the project — here it failed `yarn lint` on a bundled
  // `readability.js`, from a directory git was already ignoring.
  const profile = resolve(tmpdir(), `wcag-audit-profile-${opt.port}`);
  mkdirSync(profile, { recursive: true });
  const child = spawn(
    binary,
    [
      `--remote-debugging-port=${opt.port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      `${opt.base}${opt.routes[0]}`,
    ],
    { detached: true, stdio: 'ignore' }
  );
  child.on('error', (e) => {
    return fail(`could not start ${binary}: ${e.message}`);
  });
  child.unref();
}

const pages = (await waitForChrome()).filter((t) => {
  return t.type === 'page';
});
const target =
  pages.find((p) => {
    return p.url.startsWith(opt.base);
  }) ?? pages[0];
if (!target) fail('no page target is open.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
const pending = new Map();
let nextId = 1;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id === undefined) return;
  const slot = pending.get(message.id);
  if (!slot) return;
  pending.delete(message.id);
  if (message.error) slot.reject(new Error(`${slot.method}: ${message.error.message}`));
  else slot.resolve(message.result);
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

const send = (method, params = {}) => {
  const id = nextId++;
  return new Promise((res, rej) => {
    pending.set(id, { resolve: res, reject: rej, method });
    socket.send(JSON.stringify({ id, method, params }));
  });
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'evaluation failed');
  return result.value;
};

const KEYS = { Tab: 9, Escape: 27 };
const press = async (key) => {
  for (const type of ['keyDown', 'keyUp'])
    await send('Input.dispatchKeyEvent', {
      type,
      key,
      code: key,
      windowsVirtualKeyCode: KEYS[key],
      nativeVirtualKeyCode: KEYS[key],
    });
};

const goto = async (url) => {
  if (!opt.quiet) process.stderr.write(`  → ${url}\n`);
  await send('Page.navigate', { url });
  // A router-driven app repaints after the load event; one settle beats a fixed guess.
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    const ready = await evaluate(
      'document.readyState === "complete" && !!document.querySelector("main")'
    );
    if (ready) break;
  }
  await sleep(400);
};

const setScheme = async (scheme) => {
  await send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: scheme },
      { name: 'prefers-reduced-motion', value: 'reduce' },
    ],
  });
};

/**
 * Tab through the page for real and record what each stop looks like when focused.
 *
 * Bounded by the element count rather than by a fixed number of presses: the walk stops as soon
 * as it lands on an index it has already seen, which is the tab cycle closing.
 */
const walkFocus = async () => {
  const count = await evaluate(`(${FOCUS_BASELINE.toString()})()`);
  const seen = new Map();
  // Start from the document, so the first Tab lands on the first stop rather than wherever a
  // previous route's scan left focus.
  await evaluate('document.activeElement && document.activeElement.blur()');
  for (let i = 0; i < count + 4; i++) {
    await press('Tab');
    const stop = await evaluate(`(${FOCUS_PROBE.toString()})()`);
    if (!stop) continue;
    if (seen.has(stop.index)) break;
    seen.set(stop.index, stop);
  }
  // A strong indicator that an ancestor cuts in half is still a finding, so clipping is kept
  // even when the ring itself is exactly what was asked for.
  return [...seen.values()].filter((s) => {
    return !s.strong || s.clipped.length > 0;
  });
};

/**
 * Click something, within a root, by CSS selector or by visible text.
 *
 * `text:Delete` rather than a selector, because the interesting buttons in a modal are named and
 * not classed — a generated class name is the wrong handle for “the one that says Delete”, and
 * CSS has no text predicate. Answers false when nothing matches, so a step that does not apply
 * to this route is skipped rather than failing the run.
 */
const clickIn = async (root, step) => {
  const scope =
    root === 'document' ? 'document' : `document.querySelector(${JSON.stringify(root)})`;
  const body = step.startsWith('text:')
    ? `[...scope.querySelectorAll('button, [role="button"], a')].find((el) => {
         return (el.textContent || '').trim().toLowerCase().includes(${JSON.stringify(
           step.slice(5).trim().toLowerCase()
         )}) && !el.disabled;
       })`
    : `scope.querySelector(${JSON.stringify(step)})`;

  return evaluate(`
    (() => {
      const scope = ${scope};
      if (!scope) return false;
      const el = ${body};
      if (!el) return false;
      el.click();
      return true;
    })()
  `);
};

const runScan = async () => {
  const source = SCANNER.toString()
    .replaceAll('REQUIRED_NORMAL', String(opt.min))
    .replaceAll('NON_TEXT', String(opt.nonText));
  return evaluate(`(${source})()`);
};

// ── the sweep ────────────────────────────────────────────────────────────────
let routes = [...opt.routes];
if (opt.crawl) {
  await goto(`${opt.base}${routes[0]}`);
  const found = await evaluate(`
    [...document.querySelectorAll(${JSON.stringify(opt.crawl)})]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && h.startsWith('/') && !h.startsWith('//'))
  `);
  routes = [...new Set([...routes, ...(found ?? [])])];
}

const findings = [];
const focusFindings = [];
// What was actually looked at, and what was asked for and not found. A green report over a modal
// that never opened is the failure mode this whole tool would be worthless for.
const visited = new Set();
const skipped = [];
const targetFindings = [];
const clipFindings = [];
const reflowFindings = [];

/**
 * Emulate a phone, or clear the emulation.
 *
 * `mobile: true` and touch emulation together, because half of what changes at 390px is the
 * media queries and the other half is the pointer: a drawer that only exists under `md`, and a
 * hover affordance that has nowhere to go. Auditing a narrow desktop window measures neither.
 */
const setViewport = async (spec) => {
  if (!spec) {
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    return;
  }
  const [width, height] = spec.split('x').map(Number);
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
};

for (const scheme of opt.schemes) {
  await setScheme(scheme);
  for (const viewport of opt.viewports.length ? opt.viewports : [null]) {
    await setViewport(viewport);
    const where = viewport ? `${scheme} @${viewport}` : scheme;
    for (const route of routes) {
      await goto(`${opt.base}${route}`);
      const tag = { scheme: where, route, surface: 'page' };
      visited.add(`${route} ${where} — page`);
      const scan = await runScan();
      for (const f of scan.text) findings.push({ ...tag, type: 'text', ...f });
      for (const f of scan.nonText) findings.push({ ...tag, type: 'non-text', ...f });
      for (const f of scan.targets) targetFindings.push({ ...tag, ...f });
      for (const f of scan.clipped) clipFindings.push({ ...tag, ...f });
      if (scan.reflow) reflowFindings.push({ ...tag, ...scan.reflow });

      if (opt.focus) for (const f of await walkFocus()) focusFindings.push({ ...tag, ...f });

      for (const selector of opt.opens) {
        if (!(await clickIn('document', selector))) {
          skipped.push(`${route} ${where}: --open ${selector} matched nothing`);
          continue;
        }
        await sleep(700);
        if (!(await evaluate('!!document.querySelector("dialog[open]")'))) {
          skipped.push(`${route} ${where}: --open ${selector} opened no dialog`);
          continue;
        }

        const record = async (surface) => {
          const modalTag = { scheme: where, route, surface };
          visited.add(`${route} ${where} — ${surface}`);
          const s = await runScan();
          for (const f of s.text) findings.push({ ...modalTag, type: 'text', ...f });
          for (const f of s.nonText) findings.push({ ...modalTag, type: 'non-text', ...f });
          for (const f of s.targets) targetFindings.push({ ...modalTag, ...f });
          for (const f of s.clipped) clipFindings.push({ ...modalTag, ...f });
          if (s.reflow) reflowFindings.push({ ...modalTag, ...s.reflow });
          // Focus inside a dialog is where it matters most, and where the ring is most likely
          // to be clipped: a modal footer is a bounded box with buttons flush against its edge.
          if (opt.focus)
            for (const f of await walkFocus()) focusFindings.push({ ...modalTag, ...f });
        };
        await record(`modal via ${selector}`);

        /**
         * The states a modal only reaches once someone presses something inside it.
         *
         * A modal at rest is the easy half. The error banner a failed action renders, the busy
         * state a running one shows — those are new colours on a surface the resting scan never
         * saw, and they are the ones most likely to have been styled by hand.
         */
        for (const step of opt.thens) {
          if (!(await clickIn('dialog[open]', step))) {
            skipped.push(`${route} ${where}: --then ${step} matched nothing in the open dialog`);
            continue;
          }
          // Long enough for a simulated action to fail and render whatever it renders.
          await sleep(1400);
          if (!(await evaluate('!!document.querySelector("dialog[open]")'))) {
            skipped.push(`${route} ${where}: --then ${step} closed the dialog — nothing to scan`);
            break;
          }
          await record(`modal via ${selector} → ${step}`);
        }

        await press('Escape');
        await sleep(500);
      }
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
// Collapse repeats: the same colour pair on the same kind of element is one decision to make,
// however many cards it renders on.
const group = new Map();
for (const f of findings) {
  const key = `${f.type}|${f.scheme}|${f.fg}|${f.bg}|${f.path.split(' > ').pop()}`;
  const slot = group.get(key);
  if (slot) {
    slot.count += 1;
    slot.routes.add(f.route);
    slot.surfaces.add(f.surface);
  } else {
    group.set(key, { ...f, count: 1, routes: new Set([f.route]), surfaces: new Set([f.surface]) });
  }
}

const rows = [...group.values()].sort((a, b) => {
  return a.ratio - b.ratio;
});
const real = rows.filter((r) => {
  return !r.disabled;
});
const exempt = rows.filter((r) => {
  return r.disabled;
});

const line = (r) => {
  const where = [...r.routes].slice(0, 3).join(', ') + ([...r.routes].length > 3 ? ' …' : '');
  const flags = [r.large ? 'large' : null, r.hidden ? 'aria-hidden' : null, r.kind ?? null]
    .filter(Boolean)
    .join(' ');
  return [
    `  ${String(r.ratio).padStart(5)}:1  (needs ${r.required})  ${r.scheme.padEnd(5)} ${r.fg} on ${r.bg}`,
    `      ${r.path}${flags ? `   [${flags}]` : ''}`,
    r.sample ? `      “${r.sample}”` : null,
    `      ×${r.count} — ${where}${[...r.surfaces].some((s) => s !== 'page') ? ` (${[...r.surfaces].filter((s) => s !== 'page').join(', ')})` : ''}`,
  ]
    .filter(Boolean)
    .join('\n');
};

process.stdout.write(
  `\nwcag-audit — ${routes.length} route(s) × ${opt.schemes.join('/')} on ${opt.base}\n`
);
process.stdout.write(`${'─'.repeat(78)}\n`);

const modalSurfaces = [...visited].filter((v) => {
  return v.includes('— modal');
});
process.stdout.write(
  `${visited.size} surface(s) scanned${modalSurfaces.length ? `, ${modalSurfaces.length} of them inside a dialog` : ''}\n`
);
if (skipped.length) {
  process.stdout.write(`\n${skipped.length} step(s) did not run — these were NOT audited:\n`);
  for (const s of skipped) process.stdout.write(`  · ${s}\n`);
}

if (real.length === 0) {
  process.stdout.write('\nNo contrast failures.\n');
} else {
  process.stdout.write(`\n${real.length} distinct failure(s), worst first:\n\n`);
  for (const r of real) process.stdout.write(line(r) + '\n\n');
}

if (exempt.length && !opt.quiet) {
  process.stdout.write(`${exempt.length} in disabled controls (1.4.3 exempts these):\n`);
  for (const r of exempt)
    process.stdout.write(`  ${String(r.ratio).padStart(5)}:1  ${r.scheme.padEnd(5)} ${r.path}\n`);
  process.stdout.write('\n');
}

if (opt.focus) {
  const byKey = new Map();
  for (const f of focusFindings) byKey.set(`${f.scheme}|${f.path}|${f.sample}`, f);
  const bare = [...byKey.values()].filter((f) => {
    return f.indicator === 'none';
  });
  const clipped = [...byKey.values()].filter((f) => {
    return f.clipped?.length > 0;
  });
  const weak = [...byKey.values()].filter((f) => {
    return f.indicator !== 'none' && !(f.clipped?.length > 0);
  });

  if (byKey.size === 0) process.stdout.write('Focus: every focusable element draws a ring.\n\n');
  if (bare.length) {
    process.stdout.write(`Focus (2.4.7) — ${bare.length} element(s) with NO focus indicator:\n`);
    for (const f of bare)
      process.stdout.write(
        `  ${f.scheme.padEnd(5)} ${f.route.padEnd(18)} ${f.path}  “${f.sample}”\n`
      );
    process.stdout.write('\n');
  }
  if (clipped.length) {
    process.stdout.write(
      `Focus — ${clipped.length} ring(s) drawn but CUT OFF by an ancestor's overflow:\n`
    );
    for (const f of clipped)
      process.stdout.write(
        `  ${f.scheme.padEnd(5)} ${f.route.padEnd(18)} ${f.path}  “${f.sample}”\n      ${f.clipped.join('; ')}\n`
      );
    process.stdout.write('\n');
  }
  // Passes 2.4.7 — and is the first thing a washed-out panel loses, which is the whole reason
  // this tool exists. Reported separately rather than silently counted as a pass.
  if (weak.length && !opt.quiet) {
    process.stdout.write(`Focus — ${weak.length} element(s) marked by colour alone:\n`);
    for (const f of weak)
      process.stdout.write(
        `  ${f.scheme.padEnd(5)} ${f.route.padEnd(18)} ${f.indicator.padEnd(18)} ${f.path}  “${f.sample}”\n`
      );
    process.stdout.write('\n');
  }
}

// ── the two that only bite on a phone ────────────────────────────────────────
const smallTargets = new Map();
for (const f of targetFindings) smallTargets.set(`${f.scheme}|${f.path}|${f.sample}`, f);
if (smallTargets.size) {
  process.stdout.write(
    `Target size (2.5.8) — ${smallTargets.size} control(s) under 24×24 CSS px:\n`
  );
  for (const f of smallTargets.values())
    process.stdout.write(
      `  ${f.scheme.padEnd(16)} ${`${f.w}×${f.h}`.padEnd(9)} ${f.path}  “${f.sample}”\n`
    );
  process.stdout.write('\n');
}
const clips = new Map();
for (const f of clipFindings) clips.set(`${f.scheme}|${f.surface}|${f.path}`, f);
if (clips.size) {
  process.stdout.write(
    `Cut off by its own dialog — ${clips.size} box(es) past the dialog's edge:\n`
  );
  for (const f of clips.values())
    process.stdout.write(
      `  ${f.scheme.padEnd(16)} ${String(f.over + 'px').padEnd(7)} ${f.path}\n      wants width ${f.width} inside a ${f.dialogWidth}px dialog · radius ${f.radius}\n      ${f.surface}\n`
    );
  process.stdout.write('\n');
}
if (reflowFindings.length) {
  process.stdout.write(`Reflow (1.4.10) — ${reflowFindings.length} view(s) scroll sideways:\n`);
  for (const f of reflowFindings) {
    process.stdout.write(
      `  ${f.scheme.padEnd(16)} ${f.route.padEnd(18)} content ${f.scrollWidth}px in a ${f.innerWidth}px viewport\n`
    );
    for (const c of f.culprits) process.stdout.write(`      ${c.path} → right edge ${c.right}px\n`);
  }
  process.stdout.write('\n');
}

if (opt.json) {
  writeFileSync(
    opt.json,
    JSON.stringify({ findings, focusFindings, targetFindings, reflowFindings, routes }, null, 2)
  );
  process.stdout.write(`Full findings → ${opt.json}\n`);
}

socket.close();
process.exit(
  real.length === 0 &&
    smallTargets.size === 0 &&
    clips.size === 0 &&
    reflowFindings.length === 0 &&
    (!opt.focus || focusFindings.length === 0)
    ? 0
    : 1
);
