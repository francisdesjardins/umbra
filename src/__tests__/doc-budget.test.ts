import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * The agent-instruction files have a size budget, and it is a test because nothing else notices.
 *
 * Every `CLAUDE.md` is loaded in full into the context of every session, so a paragraph added here
 * costs on every task forever — and the cost is invisible at the moment of writing, which is the
 * shape of failure a gate is for. These files reached 15 300 words by growing a little at a time,
 * each addition obviously worth it on its own.
 *
 * **The budget is not a style preference, it is the routing rule made enforceable.** A fact belongs
 * where it can be checked, in this order:
 *
 * 1. **A test or a gate** — `entry-isolation`, `binding-parity`, `docs-exports`, the compatibility
 *    matrix. It cannot drift, so it is always the best home.
 * 2. **JSDoc on the thing it constrains** — the "why" travels with the code and shows up in an
 *    editor at the moment it is needed. This is where most of what used to be here belongs.
 * 3. **`CLAUDE.md`** — only what is attached to no single file: the folder rule, the vocabulary, the
 *    commands, and pointers to the two above.
 *
 * So the way to pass this test is almost never to delete a fact. It is to move it to (1) or (2), or —
 * for anything historical — to recognise that the CHANGELOG already owns it, since the repo's own
 * convention is that comments never narrate the past.
 *
 * The limits are the sizes reached by doing exactly that, rounded up to leave room for a real
 * addition. **Raising one is a decision to state out loud**, not a way to make a failing test pass:
 * if a file has genuinely earned more, say so in the commit that raises it.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Word budgets, per file. Words rather than lines: prose reflows, context cost does not. */
const BUDGETS: Readonly<Record<string, number>> = {
  'CLAUDE.md': 3000,
  'src/CLAUDE.md': 6000,
  'src/store/CLAUDE.md': 1400,
  'playground/CLAUDE.md': 4200,
};

/** The whole set, so the total is visible rather than only the parts. */
const TOTAL_BUDGET = 13_500;

const wordsIn = (path: string): number => {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8').split(/\s+/).filter(Boolean).length;
};

test.describe('the agent instructions have a budget', () => {
  test('no file is over its own', () => {
    const over = Object.entries(BUDGETS)
      .map(([path, budget]) => {
        return { path, budget, words: wordsIn(path) };
      })
      .filter((entry) => {
        return entry.words > entry.budget;
      })
      .map((entry) => {
        return `${entry.path}: ${String(entry.words)} words, budget ${String(entry.budget)}`;
      });

    expect(
      over,
      'Move the new material to a test or to the JSDoc of what it constrains — see this file’s doc comment. Raising the budget is a decision to state in the commit.'
    ).toEqual([]);
  });

  test('the set is under its total', () => {
    const total = Object.keys(BUDGETS).reduce((sum, path) => {
      return sum + wordsIn(path);
    }, 0);

    // The per-file budgets sum higher than this on purpose: one file may take room from another, and
    // what actually costs a session is the sum of all four.
    expect(
      total,
      `Every CLAUDE.md loads in full, every session: ${String(total)} words against ${String(TOTAL_BUDGET)}.`
    ).toBeLessThanOrEqual(TOTAL_BUDGET);
  });

  test('every budgeted file exists, and every CLAUDE.md is budgeted', () => {
    // Guards the guard both ways. A renamed file would make the assertions above pass by reading
    // nothing, and a *new* `CLAUDE.md` would be the cheapest possible way around the budget.
    for (const path of Object.keys(BUDGETS)) {
      expect(wordsIn(path), `${path} is empty or missing`).toBeGreaterThan(50);
    }

    // Discovered rather than listed, because a hand-kept index is the thing the budget would then be
    // kept out of. `SKIP` is the set no session loads from.
    const SKIP = new Set([
      'node_modules',
      'dist',
      '.git',
      '.yarn',
      'playwright-report',
      'coverage',
    ]);
    const walk = (dir: string): string[] => {
      return readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
        const path = dir === '' ? entry.name : `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          return SKIP.has(entry.name) ? [] : walk(path);
        }
        return entry.name === 'CLAUDE.md' ? [path] : [];
      });
    };

    expect(walk('').sort(), 'A CLAUDE.md was added or removed — give it a budget.').toEqual(
      Object.keys(BUDGETS).sort()
    );
  });

  test('every path these files point at exists', () => {
    // The budget's own mechanism is to replace prose with a pointer, which trades one failure mode
    // for another: a paragraph cannot go stale by being moved, but a link can. Three were already
    // broken when this was written — `react/use-message-modal.tsx` and two siblings, from before the
    // template hooks moved into `templates/` — so the pointers are only cheaper than the prose if
    // something checks them.
    const LINK = /\[[^\]]+\]\(([^)#\s]+)(?:#[^)\s]*)?\)/g;
    const broken: string[] = [];

    for (const doc of Object.keys(BUDGETS)) {
      const base = resolve(REPO_ROOT, dirname(doc));
      const text = readFileSync(resolve(REPO_ROOT, doc), 'utf8');
      for (const match of text.matchAll(LINK)) {
        const target = match[1] ?? '';
        if (target.startsWith('http') || target.startsWith('mailto:')) {
          continue;
        }
        // The escaped `\_\_tests\_\_` markdown links have to be unescaped to be paths again.
        if (!existsSync(resolve(base, target.replaceAll('\\_', '_')))) {
          broken.push(`${doc} → ${target}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });
});
