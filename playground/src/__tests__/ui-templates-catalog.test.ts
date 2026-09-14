import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYGROUND = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGE = join(PLAYGROUND, 'src/pages/ui-templates/ui/UITemplatesPage.tsx');
const TEMPLATES = join(PLAYGROUND, 'src/widgets/code-viewer/model/code-samples/templates.ts');

const source = (file: string): string => {
  return readFileSync(file, 'utf8');
};

const displayedKeys = (page: string): string[] => {
  return [...page.matchAll(/codeKey: '([^']+)'/g)].map((match) => {
    return match[1] ?? '';
  });
};

const registeredKeys = (templates: string): string[] => {
  return [...templates.matchAll(/^\s+'([^']+)':/gm)].map((match) => {
    return match[1] ?? '';
  });
};

const rawSources = (templates: string): string[] => {
  return [...templates.matchAll(/from '(@\/[^']+\?raw)'/g)].map((match) => {
    return match[1] ?? '';
  });
};

test.describe('the UI Templates catalogue', () => {
  test('every displayed code key is registered', () => {
    const page = source(PAGE);
    const templates = source(TEMPLATES);
    const registered = new Set(registeredKeys(templates));
    const missing = displayedKeys(page).filter((key) => {
      return !registered.has(key);
    });

    expect(missing).toEqual([]);
  });

  test('every raw source import points to an existing file', () => {
    const templates = source(TEMPLATES);
    const missing = rawSources(templates)
      .map((specifier) => {
        return join(PLAYGROUND, 'src', specifier.slice(2).replace(/\?raw$/, ''));
      })
      .filter((file) => {
        return !existsSync(file);
      });

    expect(missing).toEqual([]);
  });
});
