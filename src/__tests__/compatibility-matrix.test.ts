import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import * as prettier from 'prettier';
import {
  BINDING_ROWS,
  OPTION_ROWS,
  allReferences,
  renderMatrix,
  worklist,
} from './compatibility-matrix.js';
import { collectOptionNames } from './option-surface.js';

/**
 * The compatibility matrix, held to the source it describes.
 *
 * A table of what-works-with-what is only worth having if it cannot quietly fall behind. Three things
 * are checked here, and each answers a way this kind of document has already gone wrong in this repo:
 *
 * 1. **Every option has a row, and every row names a real option.** A new option arrives in
 *    `UseModalBaseOptions` and the matrix says nothing about it — that is a failing test rather than a
 *    paragraph nobody thought to update.
 * 2. **Every test a cell cites resolves**, file and title. Renaming a test is how a matrix becomes
 *    false while looking maintained, and a rename touches the test and nothing else.
 * 3. **`API.md` carries the rendered table byte for byte.** Two hand-kept copies disagree in one of
 *    them; there is one copy, and the doc holds a render of it.
 *
 * What it cannot check, stated here rather than left to be assumed: **that the cited test proves the
 * cell.** A `✓` next to a resolving title is a human claim. Same scope limit `docs-exports.test.ts`
 * keeps about type-only imports — a gate that overstates itself is worse than a smaller one.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SRC_ROOT, '..');

/**
 * Options deliberately absent from `API.md`'s `### Options` table, each with the reason it is.
 *
 * A set rather than a filter in the test, so adding to it is a visible decision.
 */
const OPTIONS_TABLE_EXEMPT = new Set([
  // Documented with an example in the Dialog Manager chapter, where the asking door belongs.
  'onOpenRequest',
  // `@internal`, set by the template hooks rather than by a caller.
  'clipContainer',
]);

const BEGIN = '<!-- BEGIN COMPATIBILITY MATRIX -->';
const END = '<!-- END COMPATIBILITY MATRIX -->';

/**
 * The rendered block, formatted exactly as `yarn docs:matrix` would write it.
 *
 * Through prettier rather than compared raw, because prettier owns the layout of this repository's
 * markdown — it pads every column to its widest cell and normalises `*em*` to `_em_`. The script does
 * the same before writing, so this is a byte comparison against what the script produces: if it
 * passes, running `docs:matrix` changes nothing.
 *
 * It used to be a whitespace normaliser instead, which was a workaround for the script writing
 * unformatted output — a arrangement that left `API.md` dirty after every run, and rewrote the
 * document as a side effect of merely *listing* the worklist.
 */
async function renderedBlock(): Promise<string> {
  const formatted = await prettier.format(`${BEGIN}\n\n${renderMatrix().trim()}\n\n${END}\n`, {
    ...(await prettier.resolveConfig(resolve(REPO_ROOT, 'API.md'))),
    filepath: 'API.md',
  });
  return formatted.slice(BEGIN.length, formatted.lastIndexOf(END)).trim();
}

test.describe('the compatibility matrix', () => {
  test('every option a caller can pass has exactly one row', () => {
    const options = collectOptionNames();

    // Guards the guard: a parser that stopped matching would make both checks below pass on an
    // empty list, which is the exact silent failure this file exists to prevent.
    expect(options.length).toBeGreaterThan(15);

    const rows = OPTION_ROWS.map((row) => {
      return row.option;
    });

    const missing = options.filter((option) => {
      return !rows.includes(option);
    });
    expect(
      missing,
      `Add a row to OPTION_ROWS in src/__tests__/compatibility-matrix.ts for: ${missing.join(', ')}`
    ).toEqual([]);

    const unknown = rows.filter((row) => {
      return !options.includes(row);
    });
    expect(
      unknown,
      `These rows name options that no longer exist on UseModalBaseOptions or ModalVariant: ${unknown.join(', ')}`
    ).toEqual([]);

    const duplicated = rows.filter((row, index) => {
      return rows.indexOf(row) !== index;
    });
    expect(duplicated, `Listed twice: ${duplicated.join(', ')}`).toEqual([]);
  });

  test('every test a cell rests on resolves to a real file and a real title', () => {
    const references = allReferences();
    expect(references.length).toBeGreaterThan(10);

    const broken: string[] = [];
    const sources = new Map<string, string>();

    for (const { where, ref } of references) {
      let source = sources.get(ref.file);
      if (source === undefined) {
        try {
          source = readFileSync(resolve(REPO_ROOT, ref.file), 'utf8');
        } catch {
          broken.push(`${where}: no such file ${ref.file}`);
          continue;
        }
        sources.set(ref.file, source);
      }
      if (!source.includes(ref.title)) {
        broken.push(`${where}: ${ref.file} has no test titled '${ref.title}'`);
      }
    }

    expect(broken.join('\n')).toBe('');
  });

  test('the binding columns are the entry points the package publishes', () => {
    const manifest: { exports: Record<string, unknown> } = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')
    ) as { exports: Record<string, unknown> };

    // The root is not a column: it is what every binding re-exports, so a capability row about it
    // would be three identical cells.
    const bindings = Object.keys(manifest.exports)
      .filter((specifier) => {
        return specifier !== '.';
      })
      .map((specifier) => {
        return specifier.replace('./', '');
      })
      .sort();

    expect(
      bindings,
      'A binding was added or removed — BindingRow needs a column for it, and `renderMatrix` a header.'
    ).toEqual(['react', 'solid', 'vanilla']);

    // Every row answers for all three — the type already holds that, so what is checked here is the
    // part it cannot: **a refusal owes a reason, and a half-answer owes its limit.** `✗ by design` and
    // `~` are the two states whose whole content is the explanation, so a bare symbol in either is a
    // cell that tells a reader nothing they could act on. `✓ untested` is deliberately exempt: its
    // meaning is complete without prose, and demanding a note there would produce twenty
    // restatements of "nothing verifies this".
    const unexplained = BINDING_ROWS.flatMap((row) => {
      return (
        [
          ['umbra/react', row.react],
          ['umbra/solid', row.solid],
          ['umbra/vanilla', row.vanilla],
        ] as const
      )
        .filter(([, value]) => {
          const owes = value.state === 'no-by-design' || value.state === 'partial';
          return owes && value.note === undefined && value.references === undefined;
        })
        .map(([binding]) => {
          return `${row.capability} (${binding})`;
        });
    });
    expect(
      unexplained,
      'A `✗ by design` or `~` cell needs a note or a reference — the reason is the cell.'
    ).toEqual([]);
  });

  /**
   * The hand-written option table, held to the same source the matrix is.
   *
   * The matrix chapter is generated, so a new option reaches `API.md` the moment it has a row —
   * and reaches it in a table a reader looking up "what can I pass" does not open. The **prose**
   * table under `### Options` is the one they read, nothing regenerates it, and nothing asked for
   * it: `onError` shipped documented in the chapter and absent from the table, which is the drift
   * the handoff predicted in the abstract before it happened in the concrete.
   *
   * Narrow on purpose. It asks one question — is every option a caller can pass named in the table
   * a caller reads — and the two exceptions are written here rather than left as silence. The
   * broader gate (a root export `API.md` never mentions) would fail on about twenty names today,
   * most of them types, and needs a decision about what it should demand before it can exist.
   */
  test('the Options table names every option a caller can pass', () => {
    const doc = readFileSync(resolve(REPO_ROOT, 'API.md'), 'utf8');
    const start = doc.indexOf('### Options');
    expect(start, 'API.md is missing the `### Options` heading').toBeGreaterThan(-1);
    const table = doc.slice(start, doc.indexOf('\n### ', start + 1));

    const missing = OPTION_ROWS.map((row) => {
      return row.option;
    })
      .filter((option) => {
        return !OPTIONS_TABLE_EXEMPT.has(option);
      })
      .filter((option) => {
        return !table.includes(`\`${option}?\``) && !table.includes(`\`${option}\``);
      });

    expect(
      missing,
      `Add a row to API.md's \`### Options\` table for: ${missing.join(', ')}`
    ).toEqual([]);
  });

  test('API.md carries the rendered matrix', async () => {
    const doc = readFileSync(resolve(REPO_ROOT, 'API.md'), 'utf8');
    const start = doc.indexOf(BEGIN);
    const end = doc.indexOf(END);

    expect(start, `API.md is missing ${BEGIN}`).toBeGreaterThan(-1);
    expect(end, `API.md is missing ${END}`).toBeGreaterThan(start);

    const embedded = doc.slice(start + BEGIN.length, end).trim();
    expect(
      embedded,
      'API.md and the table have diverged. Run `yarn docs:matrix` to re-render it.'
    ).toBe(await renderedBlock());
  });

  test('the open cells are the worklist', () => {
    const open = worklist();

    // Not a threshold to satisfy — the list is the output. Printing it is what makes the matrix a
    // backlog rather than a description, and `✓ untested` and `~` are declared states precisely so
    // they can be enumerated instead of found by reading.
    console.log(
      `\ncompatibility matrix — ${String(open.length)} open cells:\n${open.join('\n')}\n`
    );

    // One assertion, and it is about honesty rather than count: an open cell has to say something
    // about itself, or it is a symbol with no way to act on it.
    expect(
      open.every((entry) => {
        return entry.includes('—') || entry.length > 20;
      })
    ).toBe(true);
  });
});
