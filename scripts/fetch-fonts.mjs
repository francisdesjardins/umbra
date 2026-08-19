/**
 * Pull the latin subsets of the three faces out of Google Fonts, drop them in the playground's
 * public/fonts/, and emit the @font-face sheet that points at them. Self-hosting is what lets the
 * files be preloaded from the same origin, which is what removes the swap entirely.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT_DIR = 'D:/workspace/francisdesjardins/2025/dialogManager/playground/public/fonts';
const CSS_OUT =
  'D:/workspace/francisdesjardins/2025/dialogManager/playground/src/app/styles/fonts.css';

// No italic axis for Newsreader: it dresses h1–h3 and the wordmark, none of which are italic, and
// the face costs 147 kB. Every <em> on the site is body copy, which is Geist.
const URL =
  'https://fonts.googleapis.com/css2?family=Geist:wght@400..600&family=Geist+Mono:wght@400..500' +
  '&family=Newsreader:opsz,wght@6..72,400..600&display=swap';

const css = await fetch(URL, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
  },
}).then((r) => r.text());

// Blocks come annotated with their subset in a comment just above.
const blocks = [...css.matchAll(/\/\*\s*([a-z0-9-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];
const latin = blocks.filter(([, subset]) => subset === 'latin');
console.log(`${blocks.length} faces, ${latin.length} latin`);

mkdirSync(OUT_DIR, { recursive: true });

const slug = (family, style) =>
  family.toLowerCase().replace(/\s+/g, '-') + (style === 'italic' ? '-italic' : '') + '.woff2';

const out = [];
for (const [, , block] of latin) {
  const family = /font-family:\s*'([^']+)'/.exec(block)[1];
  const style = /font-style:\s*(\w+)/.exec(block)?.[1] ?? 'normal';
  const weight = /font-weight:\s*([^;]+);/.exec(block)[1].trim();
  const src = /url\((https:[^)]+\.woff2)\)/.exec(block)[1];
  const file = slug(family, style);

  const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
  writeFileSync(`${OUT_DIR}/${file}`, buf);
  console.log(
    `  ${file.padEnd(22)} ${String(Math.round(buf.length / 1024)).padStart(4)} kB  ${family} ${style} ${weight}`
  );

  out.push(
    `@font-face {\n` +
      `  font-family: '${family}';\n` +
      `  font-style: ${style};\n` +
      `  font-weight: ${weight};\n` +
      `  font-display: swap;\n` +
      `  src: url('/fonts/${file}') format('woff2');\n` +
      `}`
  );
}

writeFileSync(
  CSS_OUT,
  `/**\n` +
    ` * The three faces, served from this origin so they can be preloaded and arrive before first\n` +
    ` * paint. A cross-origin stylesheet costs a second round trip, and the swap that follows moves\n` +
    ` * every block of text on the page.\n` +
    ` *\n` +
    ` * Latin subsets only, variable weight axes. Regenerate with scripts/fetch-fonts.mjs.\n` +
    ` */\n\n` +
    out.join('\n\n') +
    '\n'
);
console.log(`\nwrote ${CSS_OUT}`);
