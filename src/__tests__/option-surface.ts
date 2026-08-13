import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The option surface, read out of `core/types.ts` rather than restated.
 *
 * A parser rather than an import for the reason `collect-exports.ts` is one: these names are wanted
 * in the **unit** project, which is Node with no DOM and no framework, and a type has no runtime to
 * import anyway. Static text is the only thing there is to read.
 *
 * It exists so a table *about* the options — the compatibility matrix — cannot fall behind them. A
 * new option lands in `UseModalBaseOptions` and the row for it is missing, which is a failing test
 * rather than a paragraph nobody updated.
 *
 * @internal Test helper, not part of the public API.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The body of `export type <name>`, from its `=` to the brace that closes it.
 *
 * Brace-counted rather than regexed to a line: `ModalVariant` is a union of two object literals and
 * `UseModalBaseOptions` holds nested function types, so "up to the next `};` at column 0" would cut
 * either one in the wrong place — and cutting early is the failure that leaves the caller with a
 * short list it has no way to know is short.
 */
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
 * Every option a caller can pass, both halves of it.
 *
 * `UseModalBaseOptions` is the flat surface and `ModalVariant` is the modal/non-modal discriminated
 * union the three dismissal options live in — a consumer sees one object (`UseModalOptions` is their
 * intersection), so the matrix asks about one list.
 */
export function collectOptionNames(): string[] {
  const source = readFileSync(resolve(SRC_ROOT, 'core', 'types.ts'), 'utf8');
  return [
    ...membersOf(typeBody(source, 'UseModalBaseOptions')),
    ...membersOf(typeBody(source, 'ModalVariant')),
  ];
}
