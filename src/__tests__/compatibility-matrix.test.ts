import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import * as prettier from 'prettier';
import {
  BINDING_ROWS,
  OPTION_ROWS,
  PLATFORM_ROWS,
  WCAG_ROWS,
  allReferences,
  bindingCells,
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
 *
 * Two more hold the *vocabulary* rather than the facts, and both exist because a state whose whole
 * content is a field goes hollow the moment the field is optional: a `⏸ blocked` cell owes a
 * `recheck`, and a `caveat` owes both of its halves. Same argument as the `why` gate below,
 * applied to the two shapes added after it.
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

/** The shape `recheck.measured` and `since` are written in, so the age sort means something. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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
      return bindingCells(row)
        .filter(([, value]) => {
          const owes = value.state === 'no-by-design' || value.state === 'partial';
          // `why`, not "anything at all": a reference proves a behaviour and says nothing about why
          // it is the behaviour, and a `note` is what a `✓` carries when it feels like it. The two
          // states here have no content *but* the explanation, so the field that names it is the
          // one they must fill.
          return owes && value.why === undefined;
        })
        .map(([binding]) => {
          return `${row.capability} (${binding})`;
        });
    });
    expect(
      unexplained,
      'A `✗ by design` or `~` cell needs a `why` — the reason is the cell.'
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

  /**
   * Every row in the file, flattened to the fields the vocabulary gates read. The binding cells
   * arrive through `bindingCells`, so a fourth binding reaches these checks with the rest.
   */
  const everyRow = (): readonly {
    readonly label: string;
    readonly state: string;
    readonly recheck?: { readonly what: string; readonly measured: string };
    readonly caveat?: { readonly question: string; readonly nextStep: string };
  }[] => {
    return [
      ...BINDING_ROWS.flatMap((row) => {
        return bindingCells(row).map(([binding, value]) => {
          return { label: `${row.capability} (${binding})`, ...value };
        });
      }),
      ...PLATFORM_ROWS.map((row) => {
        return { label: row.fact, ...row };
      }),
      ...WCAG_ROWS.map((row) => {
        return { label: `WCAG ${row.criterion} ${row.name}`, ...row };
      }),
    ];
  };

  test('a blocked cell says what to re-check and when it was last measured', () => {
    // `⏸` buys exactly one thing — it leaves the actionable list — and `recheck` is the price. A
    // blocked cell with nothing to look at is a `~` that stopped being counted, which is the failure
    // the state was introduced to prevent rather than to enable. The date is checked for shape as
    // well as presence: an unparseable one sorts wrong, and the watch list is sorted by staleness.
    const silent = everyRow()
      .filter((row) => {
        return row.state === 'blocked';
      })
      .filter((row) => {
        return (
          row.recheck === undefined ||
          row.recheck.what.trim() === '' ||
          !ISO_DATE.test(row.recheck.measured)
        );
      })
      .map((row) => {
        return row.label;
      });

    expect(
      silent,
      'A ⏸ blocked cell needs a `recheck` — what to look at, and an ISO date someone last did.'
    ).toEqual([]);
  });

  test('a caveat names the question and what would close it', () => {
    // The half that stops the ratchet. Four caveats were written in two weeks and none was ever
    // removed; two of them turned out to be explanations of a deliberate trade wearing the
    // worklist's clothes. An author who cannot write `nextStep` has written a `note` — that is the
    // whole test, and it is the same shape as the `why` a refusal owes.
    const vague = everyRow()
      .filter((row) => {
        return row.caveat !== undefined;
      })
      .filter((row) => {
        return (
          (row.caveat?.question ?? '').trim() === '' || (row.caveat?.nextStep ?? '').trim() === ''
        );
      })
      .map((row) => {
        return row.label;
      });

    expect(
      vague,
      'A caveat owes both halves: what is not known, and what would close it. With no next step it is a `note`.'
    ).toEqual([]);
  });

  test('the open cells are the worklist', () => {
    const { open, watch } = worklist();

    // The list is the output, not a threshold: printing it makes the matrix a backlog, which is
    // why `✓ untested` and `~` are declared states rather than something found by reading.
    // **No threshold was added when the plateau was found**, deliberately: the count sat at six for
    // ten days and the count is not what made that visible — the `since` date is, which `yarn todo`
    // sorts by and prints the age of. A failing number would say the list is too long; an age says
    // which line has been ignored, and that is the one a person can act on.
    console.log(
      `\ncompatibility matrix — ${String(open.length)} open, ${String(watch.length)} on watch:\n${[
        ...open,
        ...watch,
      ]
        .map((entry) => {
          return `  ${entry.since ?? '  undated  '}  ${entry.line}`;
        })
        .join('\n')}\n`
    );

    // About honesty, not count: an open cell that says nothing is a symbol nobody can act on.
    expect(
      [...open, ...watch].every((entry) => {
        return entry.line.includes('—') || entry.line.length > 20;
      })
    ).toBe(true);

    // The split is the point of the change, so it is asserted rather than trusted: nothing blocked
    // may reach the actionable list, and nothing but blocked may sit on the watch list.
    expect(
      open.filter((entry) => {
        return entry.line.startsWith('⏸');
      }),
      'A blocked cell reached the actionable list — check OPEN_STATES.'
    ).toEqual([]);
    expect(
      watch.every((entry) => {
        return entry.line.startsWith('⏸');
      })
    ).toBe(true);
  });
});
