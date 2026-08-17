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
 * Three checks, each answering a way this document has already gone stale: every option has a row
 * and every row a real option; every cited test resolves by file and title; `API.md` carries the
 * rendered table byte for byte. What it cannot check — that a cited test *proves* its cell — stays
 * a human claim, the same scope limit `docs-exports.test.ts` keeps about type-only imports.
 */

const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(SRC_ROOT, '..');

/** Options kept out of `API.md`'s `### Options` table — a set, so adding is a visible choice. */
const OPTIONS_TABLE_EXEMPT = new Set([
  // Documented with an example in the Dialog Manager chapter, where the asking door belongs.
  'onOpenRequest',
  // `@internal`, set by the template hooks rather than by a caller.
  'clipContainer',
]);

const BEGIN = '<!-- BEGIN COMPATIBILITY MATRIX -->';
const END = '<!-- END COMPATIBILITY MATRIX -->';

/**
 * The rendered block, formatted exactly as `yarn docs:matrix` writes it. Through prettier rather
 * than raw, because prettier owns this repo's markdown layout — column padding, `*em*` → `_em_` —
 * and the script formats before writing, so a pass means running `docs:matrix` changes nothing.
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

    // Guards the guard: a parser that stopped matching passes both checks below on an empty list.
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

    // The root is no column: every binding re-exports it, so its rows would be identical cells.
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

    // The type holds that every row answers for all three; what it cannot hold is that a refusal
    // owes a reason. `✗ by design` and `~` are the states whose whole content is the explanation.
    // `✓ untested` is exempt — a note there is twenty restatements of "nothing verifies this".
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
   * The hand-written `### Options` table, held to the same source the generated matrix is: a row
   * in the matrix reaches a chapter nobody looking up "what can I pass" opens, and nothing
   * regenerates the prose table (`onError` shipped in one and not the other). Narrow on purpose —
   * the broader gate, a root export `API.md` never names, would fail on ~20 names, mostly types.
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

    // The list is the output, not a threshold: printing it makes the matrix a backlog, which is
    // why `✓ untested` and `~` are declared states rather than something found by reading.
    console.log(
      `\ncompatibility matrix — ${String(open.length)} open cells:\n${open.join('\n')}\n`
    );

    // About honesty, not count: an open cell that says nothing is a symbol nobody can act on.
    expect(
      open.every((entry) => {
        return entry.includes('—') || entry.length > 20;
      })
    ).toBe(true);
  });
});
