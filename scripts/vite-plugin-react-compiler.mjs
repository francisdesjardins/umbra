// Named, not default: `@babel/core` is CommonJS and Node's interop gives it no `default` at all.
import { transformAsync } from '@babel/core';
import { relative, resolve } from 'node:path';

/**
 * The React Compiler for the component bundle, applied to the **source**: `@vitejs/plugin-react`'s
 * `{ babel: { plugins } }` is the pre-rolldown form, accepted under this Vite and transforming
 * nothing, and `@rolldown/plugin-babel` has no effect inside Playwright's component runner, which
 * bundles a Vite of its own. Scoped to `src/react/` because the compiler decides what a hook is by
 * name and `umbra/solid` exports `useDialog`, `useLookup` and two template hooks — unscoped it
 * writes `react/compiler-runtime` into the Solid binding. The path filter is separator-normalised
 * (Vite ids use `/`, `path.relative` the platform's own) or it matches nothing on Windows and the
 * plugin is a silent no-op. Both this and `ct-coverage` are `enforce: 'pre'`, so the array decides
 * the order and coverage must go first: it needs the file as written for its counter positions to
 * need no source map.
 *
 * @param {{ target?: string }} [options]
 */
export const reactCompiler = (options = {}) => {
  const root = resolve(import.meta.dirname, '..');
  const target = options.target ?? '19';

  return {
    name: 'umbra:react-compiler',
    enforce: 'pre',
    async transform(code, id) {
      const [file] = id.split('?');
      if (!file) {
        return null;
      }
      const path = relative(root, file).replaceAll('\\', '/');
      if (!path.startsWith('src/react/') || !/\.tsx?$/.test(path)) {
        return null;
      }

      const result = await transformAsync(code, {
        filename: file,
        // Babel meets `: string` and stops without these — a silent no-op if ever dropped.
        parserOpts: { plugins: ['typescript', 'jsx'] },
        plugins: [['babel-plugin-react-compiler', { target }]],
        babelrc: false,
        configFile: false,
        sourceMaps: true,
      });

      if (!result?.code) {
        return null;
      }
      return { code: result.code, map: result.map ?? null };
    },
  };
};
