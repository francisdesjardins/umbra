import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The two halves of the Penumbra rule from `playground/CLAUDE.md`, as a gate.
 *
 * Both failed as prose the first time they were tested. A mechanical sweep replacing Material's
 * transcribed constants with `--app-*` tokens reached into `entities/modal-template/` and left
 * sixteen shell references in files that are **copied into other people's apps** — where the
 * tokens do not exist, `var(--app-ease)` makes the whole `transition` invalid at computed-value
 * time and the dialog stops animating. Nothing in the playground can notice: the playground
 * defines the tokens. The defect only exists in the copied-out artifact.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function filesUnder(dir: string, match: RegExp): string[] {
  const found: string[] = [];
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (match.test(entry.name)) {
        found.push(full);
      }
    }
  };
  walk(dir);
  return found;
}

const relative = (file: string): string => {
  return file
    .slice(root.length + 1)
    .split(sep)
    .join('/');
};

test('the copyable templates depend on no shell token', () => {
  const offenders: string[] = [];
  for (const file of filesUnder(join(root, 'entities', 'modal-template'), /\.(css|tsx?)$/)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (line.includes('--app-')) {
          offenders.push(`${relative(file)}:${index + 1}  ${line.trim()}`);
        }
      });
  }

  expect(
    offenders,
    "Templates are copied into apps that have no --app-* sheet. Use the template's own token " +
      'family (--modal-*, --slide-*, --form-*, --content-*, --panel-*) or a plain literal.'
  ).toEqual([]);
});

test('the system half of the token sheet carries no colour and no typeface', () => {
  const system = readFileSync(join(root, 'app', 'styles', 'tokens.system.css'), 'utf8');
  // Comments are prose and may name anything; only declarations are the contract.
  const declarations = system
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => {
      return line.includes(':') && line.includes('--app-');
    });

  const coloured = declarations.filter((line) => {
    return /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(|\bcolor-mix\(/.test(line);
  });
  expect(
    coloured,
    'A colour in tokens.system.css means the base has stopped being portable — it belongs in ' +
      'tokens.skin.css, the file another project rewrites.'
  ).toEqual([]);

  const typefaced = declarations.filter((line) => {
    return /font-family|--app-font-/.test(line);
  });
  expect(typefaced, 'Typefaces are skin, not system.').toEqual([]);
});

test('nothing transitions a theme-sensitive colour', () => {
  /**
   * `color` is keyed on the scheme, and the attribute that flips the scheme flips backgrounds
   * instantly — so a transition on `color` interpolates the outgoing scheme's ink across an
   * already-switched surface. The vanilla templates found this first and wrote it down
   * ("measured at 1.08:1 mid-flip"); the shell then re-introduced it on the sidebar and the
   * wordmark, where it measured 2.5:1 and 1.08:1 across nine nav entries. Prose did not hold, so
   * this does. `background-color` and `border-color` are fine — they are not the ink.
   */
  const offenders: string[] = [];
  for (const file of filesUnder(root, /\.css$/)) {
    const text = readFileSync(file, 'utf8');
    // A transition declaration can wrap over several lines, so match the whole thing.
    for (const match of text.matchAll(/transition:[^;}]*/g)) {
      const declaration = match[0];
      const bareColor = /(^|[\s,:])color\s+/.test(declaration);
      if (bareColor) {
        offenders.push(`${relative(file)}  ${declaration.replace(/\s+/g, ' ').slice(0, 70)}`);
      }
    }
  }

  expect(
    offenders,
    'Transition background-color and border-color, never `color` — a theme flip interpolates the ' +
      'old ink over the new surface.'
  ).toEqual([]);
});

test('no component re-declares a Material easing or an MD2 metric', () => {
  const FINGERPRINTS: ReadonlyArray<readonly [string, RegExp]> = [
    ['Material standard easing', /cubic-bezier\(\s*0\.4\s*,\s*0\s*,\s*0\.2\s*,\s*1\s*\)/],
    ['MD2 line height', /line-height:\s*(1\.43|1\.75|1\.66|2\.66|1\.167|1\.235|1\.334)\b/],
    ['MD2 tracking', /letter-spacing:\s*0\.(02857|08333|00938|01071|0075)em/],
    ['MD2 elevation layer', /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.14\s*\)/],
  ];

  const offenders: string[] = [];
  for (const file of filesUnder(root, /\.(css|tsx?)$/)) {
    if (relative(file).startsWith('__tests__/')) {
      continue;
    }
    const text = readFileSync(file, 'utf8');
    text.split('\n').forEach((line, index) => {
      for (const [label, pattern] of FINGERPRINTS) {
        if (pattern.test(line)) {
          offenders.push(`${relative(file)}:${index + 1}  ${label}`);
        }
      }
    });
  }

  expect(offenders).toEqual([]);
});
