import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * The agent-instruction files have a size budget, because nothing else notices: every `CLAUDE.md`
 * loads in full into every session, so a paragraph costs on every task forever and costs nothing
 * visible when written — which is how these reached 15 300 words a little at a time. The budget is
 * the routing rule made enforceable: a fact belongs first in a test or gate (it cannot drift), then
 * in JSDoc on the thing it constrains, and in `CLAUDE.md` only when it attaches to no single file —
 * the folder rule, the vocabulary, the commands, pointers to the first two. So passing is almost
 * never deleting a fact: move it, or let the CHANGELOG own the historical ones. The limits are the
 * sizes reached by doing that, so raising one is a decision for the commit that raises it.
 *
 * **Land at 90% of a budget, not at it.** These numbers are ceilings, and a document sitting on its
 * ceiling taxes every later session with a word hunt for whatever it wants to add — which is what
 * the trim that opened this headroom was paying off. Adding a paragraph is meant to cost writing
 * the paragraph.
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

    // The per-file budgets sum higher on purpose: what costs a session is the sum of all four.
    expect(
      total,
      `Every CLAUDE.md loads in full, every session: ${String(total)} words against ${String(TOTAL_BUDGET)}.`
    ).toBeLessThanOrEqual(TOTAL_BUDGET);
  });

  test('every budgeted file exists, and every CLAUDE.md is budgeted', () => {
    // Both ways: a rename makes the above pass on nothing, a *new* file is the cheapest way round.
    for (const path of Object.keys(BUDGETS)) {
      expect(wordsIn(path), `${path} is empty or missing`).toBeGreaterThan(50);
    }

    // Discovered, not listed — a hand-kept index is what a new file gets left off. `SKIP` is the
    // set no session loads from.
    const SKIP = new Set([
      'node_modules',
      'dist',
      '.git',
      '.yarn',
      'playwright-report',
      'coverage',
    ]);
    // By path, not by name: a worktree Claude Code leaves under here is a whole checkout, so it
    // answers with a second copy of all four files. `.claude` itself stays walked — a CLAUDE.md
    // added there is one a session would load, and it should want a budget.
    const SKIP_PATH = '.claude/worktrees';
    const walk = (dir: string): string[] => {
      return readdirSync(resolve(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
        const path = dir === '' ? entry.name : `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          return SKIP.has(entry.name) || path === SKIP_PATH ? [] : walk(path);
        }
        return entry.name === 'CLAUDE.md' ? [path] : [];
      });
    };

    expect(walk('').sort(), 'A CLAUDE.md was added or removed — give it a budget.').toEqual(
      Object.keys(BUDGETS).sort()
    );
  });

  test('every path these files point at exists', () => {
    // Replacing prose with a pointer trades one stale mode for another: a moved paragraph cannot
    // go stale, a link can — three were already broken when this was written.
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
