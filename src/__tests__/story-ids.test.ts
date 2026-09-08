import { expect, test } from '@playwright/test';
import { readFileSync, globSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every id a spec mounts is a harness that exists, and every harness is typed.
 *
 * Playwright types the fixture as `StoryId = keyof Stories | (string & {})`, so the augmentation
 * `yarn story-ids` writes gives a reader the list and checks each story's props — but the union's
 * second half means a **typo still compiles**, silently, into a test that fails at run time with
 * "Unknown story". That is the hole this closes, and it is a test rather than a lint rule for the
 * reason `ct-coverage-wiring` is: the claim is about two sets agreeing, not about one line.
 */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The generated augmentations, read as text — their whole content is a list of names. */
function declaredIds(): Set<string> {
  const declared = new Set<string>();
  for (const file of ['src/__tests__/story-ids.d.ts', 'playground/src/__tests__/story-ids.d.ts']) {
    const source = readFileSync(resolve(REPO, file), 'utf8');
    // The parenthesis is prettier's — the generator emits its shape so a regenerate leaves a clean
    // tree, and this tolerates both so the gate is not what breaks when a formatter changes its mind.
    for (const match of source.matchAll(/^ {4}([A-Za-z0-9_]+): \(?typeof import\(/gm)) {
      declared.add(match[1] as string);
    }
  }
  return declared;
}

/** Every `mount('…')` in the suite, with the file that asks for it. */
function mountedIds(): { id: string; file: string }[] {
  const specs = [
    ...globSync('src/**/__tests__/**/*.ct.tsx', { cwd: REPO }),
    ...globSync('playground/src/**/__tests__/**/*.ct.tsx', { cwd: REPO }),
  ];
  return specs.flatMap((file) => {
    const source = readFileSync(resolve(REPO, file), 'utf8');
    return [...source.matchAll(/\bmount\('([^']+)'/g)].map((match) => {
      return { id: match[1] as string, file };
    });
  });
}

test.describe('story ids', () => {
  test('the suite mounts something, so the checks below are not vacuous', () => {
    expect(mountedIds().length).toBeGreaterThan(300);
    expect(declaredIds().size).toBeGreaterThan(150);
  });

  test('every mounted id names a harness that exists', () => {
    const declared = declaredIds();
    const unknown = mountedIds()
      .filter((entry) => {
        return !declared.has(entry.id);
      })
      .map((entry) => {
        return `${entry.id} (${entry.file})`;
      });

    expect(
      [...new Set(unknown)],
      'These ids match no exported harness — a typo, or a harness that was renamed. Run `yarn story-ids` if one was added.'
    ).toEqual([]);
  });

  test('the generated registry is in step with the story files', () => {
    // The other direction: a harness added without regenerating is one no spec can autocomplete.
    const exported = new Set<string>();
    for (const file of [
      ...globSync('src/**/__tests__/**/*.story.tsx', { cwd: REPO }),
      ...globSync('playground/src/**/__tests__/**/*.story.tsx', { cwd: REPO }),
    ]) {
      const source = readFileSync(resolve(REPO, file), 'utf8');
      for (const match of source.matchAll(/^export (?:function|const) ([A-Za-z0-9_]+)/gm)) {
        exported.add(match[1] as string);
      }
    }

    const declared = declaredIds();
    const missing = [...exported].filter((name) => {
      return !declared.has(name);
    });

    expect(
      missing,
      'Run `yarn story-ids` — the generated registry is behind the story files.'
    ).toEqual([]);
  });
});
