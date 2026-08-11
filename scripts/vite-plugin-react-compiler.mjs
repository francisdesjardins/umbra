// Named, not default: `@babel/core` is CommonJS, and Node's interop exposes its named exports
// through cjs-module-lexer while giving the module no `default` at all — the same import shape
// `ct-coverage` uses for `istanbul-lib-instrument`, for the same reason.
import { transformAsync } from '@babel/core';
import { relative, resolve } from 'node:path';

/**
 * The React Compiler for the component bundle, applied to the **source**.
 *
 * It exists because the obvious wiring does not work here. `@vitejs/plugin-react`'s
 * `{ babel: { plugins: [...] } }` is the pre-rolldown form: under this project's Vite it is
 * accepted and transforms nothing, which is how the component suite came to exercise uncompiled
 * code while the package shipped — or was meant to ship — compiled output. And
 * `@rolldown/plugin-babel`, which the library build and the playground use, has no effect inside
 * Playwright's component runner, because that runner bundles a Vite of its own. So the transform
 * is done here, by hand, the way `ct-coverage` does its own.
 *
 * **Scoped to `src/react/`, and that is not tidiness.** The compiler decides what a hook is by
 * name, and `umbra/solid` exports `useModal`, `useLookup` and two template hooks — unscoped, it
 * compiles Solid's and writes `import { c } from "react/compiler-runtime"` into the Solid
 * binding, which is the one thing this package promises never to do. `verify:package` catches it,
 * and it should not have to.
 *
 * **The path filter is separator-normalised** for the reason `ct-coverage`'s is: Vite hands module
 * ids with forward slashes and `path.relative` answers in the platform's own, so a `/`-only
 * predicate matches nothing on Windows and the whole plugin becomes a silent no-op.
 *
 * Order matters against `ct-coverage`: both are `enforce: 'pre'`, so the array decides, and
 * coverage must go first. It needs the file as written for its counter positions to need no
 * source map; compiling first would move every line under it.
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
        // Babel meets `: string` and stops without these — the same trap `ct-coverage` documents,
        // and the same silent no-op if it is ever dropped.
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
