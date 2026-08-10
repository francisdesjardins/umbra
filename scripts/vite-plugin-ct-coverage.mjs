import { createInstrumenter } from 'istanbul-lib-instrument';
import { relative, resolve } from 'node:path';

/**
 * Istanbul instrumentation for the component bundle, applied to the **source**.
 *
 * `vite-plugin-istanbul` is the obvious tool and it does not work here: it runs `enforce: 'post'`,
 * so it instruments the output after TypeScript has been stripped, and remaps positions through
 * the combined source map. That map exists and looks sane — 2760 mappings, the right source — and
 * the result is still wrong: on `solid/modal-outlet.ts` every counter below the file's 20-line
 * JSDoc block lands 16 lines early, attributing statements to prose and reporting
 * `export function ModalOutlet` as never executed while sixteen tests walk through it.
 *
 * So this instruments before anything else touches the file, where the positions need no map to be
 * correct: `enforce: 'pre'` hands us the file as written, and Babel parses the TypeScript and JSX
 * directly. Everything downstream — the TS transform, the React compiler, Solid's hyperscript —
 * then treats the injected counters as the ordinary JavaScript they are.
 *
 * @param {{ include?: (id: string) => boolean }} [options]
 */
export const ctCoverage = (options = {}) => {
  const root = resolve(import.meta.dirname, '..');

  const shouldInstrument =
    options.include ??
    ((id) => {
      const path = relative(root, id);
      return (
        path.startsWith('src/') &&
        /\.tsx?$/.test(path) &&
        // The harnesses are the test, not the subject.
        !path.includes('__tests__/')
      );
    });

  const instrumenter = createInstrumenter({
    esModules: true,
    coverageVariable: '__coverage__',
    // What makes reading the source possible at all: without these Babel meets `: string` and
    // stops, and the plugin silently instruments nothing.
    parserPlugins: ['typescript', 'jsx', 'importMeta', 'topLevelAwait'],
  });

  return {
    name: 'umbra:ct-coverage',
    enforce: 'pre',
    transform(code, id) {
      const [path] = id.split('?');
      if (!path || !shouldInstrument(path)) {
        return null;
      }
      return {
        code: instrumenter.instrumentSync(code, path),
        map: instrumenter.lastSourceMap() ?? null,
      };
    },
  };
};
