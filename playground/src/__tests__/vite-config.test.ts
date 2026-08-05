import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAYGROUND = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Vite's `configLoader: 'native'` — the coming default — resolves a config's imports as
 * written, so an extensionless relative specifier warns today and fails to resolve later. The
 * warning is easy to scroll past in build output, which is why it is asserted here instead.
 *
 * The same rule the library follows for its own emitted declarations (`.js` on every relative
 * import, checked by `scripts/verify-package.mjs`) — this is the config-file half of it.
 */
const RELATIVE_IMPORT = /from\s+'(\.[^']*)'/g;

test.describe('playground vite config', () => {
  test('every relative import carries a file extension', () => {
    const source = readFileSync(join(PLAYGROUND, 'vite.config.ts'), 'utf8');

    const extensionless = [...source.matchAll(RELATIVE_IMPORT)]
      .map((match) => {
        return match[1] ?? '';
      })
      .filter((specifier) => {
        return !/\.[cm]?[jt]sx?$/.test(specifier);
      });

    expect(extensionless).toEqual([]);
  });
});
