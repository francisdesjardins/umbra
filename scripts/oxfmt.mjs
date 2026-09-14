// The one place that knows where `.oxfmtrc.json` lives. oxfmt's Node API takes its options
// explicitly and ships no `resolveConfig`, so a call site reading the file itself is a call site
// that can drift from the gate `yarn format:check` runs over the same tree.
//
// **Parse failures are raised rather than returned.** `format` hands back the original text with
// the diagnostics beside it, so a caller comparing its answer to what it passed in reads an
// unparsable `@example` as one that needed no formatting — which is the whole of what
// `check-examples.mjs` is looking for.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'oxfmt';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(resolve(ROOT, '.oxfmtrc.json'), 'utf8'));

/**
 * Format `text` the way `yarn format` would format a file named `fileName` — the name carries the
 * language, so it need not exist on disk.
 *
 * @param {string} fileName
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function formatAs(fileName, text) {
  const { code, errors } = await format(fileName, text, config);
  if (errors.length > 0) {
    throw new Error(`oxfmt could not parse ${fileName}: ${errors[0].message}`);
  }
  return code;
}
