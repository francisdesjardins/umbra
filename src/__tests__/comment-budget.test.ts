import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Comments have a budget, for the reason `CLAUDE.md` states and nothing enforced: **why, not what**,
 * **never the past**, **one dense sentence beats a paragraph**. A rule that lives only in prose is
 * one every later session has to be reminded of.
 *
 * JSDoc is capped only where the public-API exception does not reach: marked `@internal`, under
 * `playground/`, or in a test — **an exemption a missing `@internal` grants by accident**, the same
 * human seam `compatibility-matrix.test.ts` keeps about whether a cited test proves its cell.
 *
 * Passing is almost never deleting a fact: move it up to the JSDoc of what it constrains, or down
 * into the test that proves it.
 */

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Words rather than lines: prose reflows, the reading cost does not. */
const LINE_BUDGET = 50;
const JSDOC_BUDGET = 120;

/** A directive is machinery, not prose, so it neither counts nor joins the block above it. */
const DIRECTIVE = /^\s*(?:\/\/|\/\*)\s*(?:oxlint-|eslint-|@ts-|prettier-|\/\s*<reference|biome-)/;

/** Section rails (`── Placement ──`) are structure, and a rule against them would only move them. */
const RAIL = /[\u2500-\u257f]{2,}/;

/**
 * `previously focused` is the HTML spec's own phrase for what the close-the-dialog steps restore,
 * so the one exemption is a platform term rather than a loophole.
 */
const PAST = /\b(?:used to|formerly|historically|in the past)\b/i;

type CommentBlock = {
  readonly kind: 'line' | 'jsdoc' | 'block';
  readonly line: number;
  readonly text: string;
  readonly words: number;
  readonly internal: boolean;
};

const countWords = (text: string): number => {
  return text
    .split('\n')
    .filter((line) => {
      return !RAIL.test(line);
    })
    .join(' ')
    .replace(/[`*_>#|]/g, ' ')
    .split(/\s+/)
    .filter((token) => {
      return /[\p{L}\p{N}]/u.test(token);
    }).length;
};

/**
 * The comment ranges in a source file, and **the string literals are the reason this is a scanner
 * rather than a regex**: the compatibility matrix and `StoriesPage` carry prose in data, including
 * the words banned below, and a line-based match would gate on it.
 *
 * A `/` opens a regex only where a value cannot already have ended — the standard heuristic, and
 * enough here because the alternative it has to beat is division.
 */
const scanComments = (source: string): { pos: number; end: number; line: number }[] => {
  const found: { pos: number; end: number; line: number }[] = [];
  let line = 1;
  let index = 0;
  let lastSignificant = '';

  const skipTo = (end: number): void => {
    for (let at = index; at < end; at++) {
      if (source[at] === '\n') {
        line++;
      }
    }
    index = end;
  };

  while (index < source.length) {
    const char = source[index] ?? '';
    const next = source[index + 1] ?? '';

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      found.push({ pos: index, end: stop, line });
      index = stop;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      found.push({ pos: index, end: stop, line });
      skipTo(stop);
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      let at = index + 1;
      while (at < source.length && source[at] !== char) {
        at += source[at] === '\\' ? 2 : 1;
      }
      skipTo(Math.min(at + 1, source.length));
      lastSignificant = char;
      continue;
    }

    if (char === '/' && /[(,=:[!&|?{};+\-*%~^<>]/.test(lastSignificant)) {
      let at = index + 1;
      let inClass = false;
      while (at < source.length) {
        const here = source[at];
        if (here === '\\') {
          at += 2;
          continue;
        }
        if (here === '[') {
          inClass = true;
        } else if (here === ']') {
          inClass = false;
        } else if ((here === '/' && !inClass) || here === '\n') {
          break;
        }
        at++;
      }
      skipTo(Math.min(at + 1, source.length));
      lastSignificant = '/';
      continue;
    }

    if (char === '\n') {
      line++;
    } else if (!/\s/.test(char)) {
      lastSignificant = char;
    }
    index++;
  }

  return found;
};

/** Contiguous `//` lines are one block, since that is how they are read and how they grow. */
const commentBlocks = (source: string): CommentBlock[] => {
  const blocks: CommentBlock[] = [];
  let run: { line: number; parts: string[]; nextLine: number } | null = null;

  const flush = (): void => {
    if (run === null) {
      return;
    }
    const text = run.parts.join('\n');
    blocks.push({
      kind: 'line',
      line: run.line,
      text,
      words: countWords(text.replace(/^[ \t]*\/\/ ?/gm, '')),
      internal: false,
    });
    run = null;
  };

  for (const range of scanComments(source)) {
    const text = source.slice(range.pos, range.end);
    if (DIRECTIVE.test(text)) {
      flush();
      continue;
    }
    if (text.startsWith('//')) {
      if (run !== null && range.line === run.nextLine) {
        run.parts.push(text);
        run.nextLine = range.line + 1;
      } else {
        flush();
        run = { line: range.line, parts: [text], nextLine: range.line + 1 };
      }
      continue;
    }
    flush();
    blocks.push({
      kind: text.startsWith('/**') ? 'jsdoc' : 'block',
      line: range.line,
      text,
      words: countWords(
        text
          .replace(/^\/\*\*?/, '')
          .replace(/\*\/$/, '')
          .replace(/^[ \t]*\*[ \t]?/gm, '')
      ),
      internal: /@internal\b/.test(text),
    });
  }

  flush();
  return blocks;
};

const sourceFiles = (from: string, into: string[] = []): string[] => {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const path = resolve(from, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        sourceFiles(path, into);
      }
    } else if (/\.tsx?$/.test(entry.name)) {
      into.push(path);
    }
  }
  return into;
};

const isTest = (rel: string): boolean => {
  return rel.includes('__tests__') || /\.(?:ct|story)\.tsx?$/.test(rel);
};

/**
 * The public-API exception, read the only mechanical way there is: the block's own `@internal`. It
 * reaches JSDoc alone — a `//` run and a bare `/* *\/` (a JSX comment, most often) document neither
 * a signature nor an export, so the sentence rule is all that applies to them.
 */
const budgetFor = (rel: string, block: CommentBlock): number | null => {
  if (block.kind !== 'jsdoc') {
    return LINE_BUDGET;
  }
  const capped = block.internal || rel.startsWith('playground/') || isTest(rel);
  return capped ? JSDOC_BUDGET : null;
};

const allBlocks = (): { rel: string; block: CommentBlock }[] => {
  const out: { rel: string; block: CommentBlock }[] = [];
  for (const root of ['src', 'playground/src']) {
    for (const file of sourceFiles(resolve(REPO_ROOT, root))) {
      const rel = relative(REPO_ROOT, file).split('\\').join('/');
      for (const block of commentBlocks(readFileSync(file, 'utf8'))) {
        out.push({ rel, block });
      }
    }
  }
  return out;
};

test.describe('comments have a budget', () => {
  test('no comment block is over its own', () => {
    const over = allBlocks()
      .filter((entry) => {
        const budget = budgetFor(entry.rel, entry.block);
        return budget !== null && entry.block.words > budget;
      })
      .map((entry) => {
        return `${entry.rel}:${String(entry.block.line)} — ${String(entry.block.words)} words`;
      });

    expect(
      over,
      'One dense sentence beats a paragraph. Move the rest up to the JSDoc of what it constrains, or down into the test that proves it — see this file’s doc comment.'
    ).toEqual([]);
  });

  test('no comment narrates the past', () => {
    const narrating = allBlocks()
      .filter((entry) => {
        const prose = entry.block.text
          .replace(/^[ \t]*(?:\/\/|\*)[ \t]?/gm, '')
          .replace(/\s+/g, ' ')
          .replace(/previously[-\s]+focus/gi, 'the-focus');
        return PAST.test(prose) || /\bpreviously\b/i.test(prose);
      })
      .map((entry) => {
        return `${entry.rel}:${String(entry.block.line)}`;
      });

    expect(
      narrating,
      'The CHANGELOG is the history. State the invariant that holds now, rather than the shape it replaced.'
    ).toEqual([]);
  });

  test('the scan reads whole files, so a pass is not vacuous', () => {
    const blocks = allBlocks();
    const files = new Set(
      blocks.map((entry) => {
        return entry.rel;
      })
    );

    // A floor on both, because every way this gate has to fail is by finding nothing: a broken
    // walk, a scanner that stops at the first construct it cannot read.
    expect(blocks.length).toBeGreaterThan(1500);
    expect(files.size).toBeGreaterThan(150);
  });
});
