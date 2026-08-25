import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The option surface parsed out of `core/types.ts`, like `collect-exports.ts`: the unit project is
 * Node with no DOM or framework, and a type has no runtime to import anyway. It exists so the
 * compatibility matrix cannot fall behind — a new option with no row is a failing test.
 * @internal Test helper, not part of the public API.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// The body of `export type <name>`, `=` to closing brace — brace-counted, because `DialogVariant`'s
// union and `UseDialogBaseOptions`'s nested function types make a line-regex cut early, silently.
function typeBody(source: string, name: string): string {
  const start = source.indexOf(`export type ${name}`);
  if (start === -1) {
    throw new Error(`option-surface: no 'export type ${name}' in core/types.ts`);
  }

  let depth = 0;
  let started = false;
  for (let i = source.indexOf('=', start); i < source.length; i++) {
    const char = source[i];
    if (char === '{') {
      depth++;
      started = true;
    } else if (char === '}') {
      depth--;
      if (started && depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`option-surface: '${name}' is never closed`);
}

/** `readonly name?:` at a member's indentation — not the ones nested inside a function type. */
const MEMBER = /^\s{2,7}readonly ([a-zA-Z]+)\??:/gm;

function membersOf(body: string): string[] {
  return [
    ...new Set(
      [...body.matchAll(MEMBER)].map((match) => {
        return match[1] ?? '';
      })
    ),
  ].filter((name) => {
    return name !== '';
  });
}

/**
 * Every option a caller can pass: `UseDialogBaseOptions`'s flat surface plus `DialogVariant`, the
 * modal/non-modal union holding the three dismissal options. A consumer sees one object — their
 * intersection, `UseDialogOptions` — so the matrix asks about one list.
 */
export function collectOptionNames(): string[] {
  const source = readFileSync(resolve(SRC_ROOT, 'core', 'types.ts'), 'utf8');
  return [
    ...membersOf(typeBody(source, 'UseDialogBaseOptions')),
    ...membersOf(typeBody(source, 'DialogVariant')),
  ];
}
