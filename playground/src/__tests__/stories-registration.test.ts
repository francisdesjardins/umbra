import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Every prop-free `*.story.tsx` harness reaches the `/stories` page.
 *
 * As prose in `playground/CLAUDE.md` the rule enforced nothing, and the failure is silent in every
 * direction: a harness off the page still builds, still type-checks, still runs in the component
 * suite, and is reachable by nobody. Nothing fails — the demo simply does not exist for readers,
 * which is the shape of silence the compatibility matrix and the doc budget were each written to
 * break.
 *
 * The exemption list below is a **door, not a design**: an omission has to be written down, so
 * adding a harness is a decision rather than a lapse. It also fails when it names a harness that no
 * longer exists or one that has since been placed, so it cannot rot into a second source of truth.
 * It is empty, and an entry added to it owes a reason here.
 *
 * A harness taking **required props** is out of scope: `StoryEntry.component` is a `ComponentType`
 * with no props, so those are fixtures rather than demos — see `playground/CLAUDE.md`. That is why
 * this parses `export function X()` with an empty parameter list rather than every export.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');
const LIBRARY_SRC = join(REPO, 'src');
const STORIES_PAGE = join(REPO, 'playground/src/pages/stories/ui/StoriesPage.tsx');

/** Prop-free harnesses the page does not show — see this file's doc comment. */
const NOT_ON_THE_PAGE = new Set<string>([]);

/** Every `*.story.tsx` under the library's `src/`, which is where the page sources its harnesses. */
function storyFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      return storyFiles(full);
    }
    return entry.name.endsWith('.story.tsx') ? [full] : [];
  });
}

/** Harnesses that take no props — the ones `StoryEntry.component` can hold. */
function propFreeHarnesses(): string[] {
  return storyFiles(LIBRARY_SRC)
    .flatMap((file) => {
      return [...readFileSync(file, 'utf8').matchAll(/export function (\w+Harness)\(\)/g)].map(
        (match) => {
          return match[1] ?? '';
        }
      );
    })
    .filter(Boolean)
    .sort();
}

test.describe('the stories page shows the harnesses', () => {
  const harnesses = propFreeHarnesses();
  const page = readFileSync(STORIES_PAGE, 'utf8');

  test('a new prop-free harness is placed on the page or listed as absent', () => {
    // Guards the guard: a parser that stopped matching passes the assertion below on an empty list.
    expect(harnesses.length).toBeGreaterThan(100);

    const unaccounted = harnesses.filter((name) => {
      return !page.includes(name) && !NOT_ON_THE_PAGE.has(name);
    });

    expect(
      unaccounted,
      `Place these on /stories — barrel export, StoryEntry, ?raw import — or add them to NOT_ON_THE_PAGE on purpose: ${unaccounted.join(', ')}`
    ).toEqual([]);
  });

  test('the absent list empties itself', () => {
    const gone = [...NOT_ON_THE_PAGE].filter((name) => {
      return !harnesses.includes(name);
    });
    expect(
      gone,
      `No longer a prop-free harness — drop from NOT_ON_THE_PAGE: ${gone.join(', ')}`
    ).toEqual([]);

    const placed = [...NOT_ON_THE_PAGE].filter((name) => {
      return page.includes(name);
    });
    expect(placed, `On the page now — drop from NOT_ON_THE_PAGE: ${placed.join(', ')}`).toEqual([]);
  });
});
