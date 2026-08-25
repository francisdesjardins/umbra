import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { type Plugin, defineConfig } from 'vite';

function stripJSDoc(): Plugin {
  return {
    name: 'strip-jsdoc',
    renderChunk(code) {
      return code.replace(/\/\*\*[\s\S]*?\*\//g, '');
    },
  };
}

export default defineConfig({
  server: {
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
    fs: {
      strict: false,
      allow: ['..'],
    },
  },
  plugins: [
    react(),
    // The compiler goes through `@rolldown/plugin-babel`, the same way the playground runs it.
    // `react({ babel: … })` is the pre-rolldown form: under Vite 8 it is accepted and silently
    // transforms nothing, which is how the shipped bundle came to carry no compiler output at all
    // while the source was written — and documented — as if it did. The evidence is one grep:
    // a compiled `use-dialog.js` opens with `_c(…)` and imports `react/compiler-runtime`.
    babel({
      // **Scoped to the React binding, and this is not tidiness.** The compiler decides what a
      // hook is by name, and `umbra/solid` exports `useDialog`, `useLookup` and two template hooks
      // — so unscoped it compiles Solid's hooks and writes `import { c } from
      // "react/compiler-runtime"` into the Solid binding, which is the one thing this package
      // promises never to do. Measured, not feared: it produced exactly that, and
      // `verify:package` failed on it.
      //
      // Both separators, because a Babel match pattern is tested against the platform's path and
      // this repo has already been bitten once by a `/`-only predicate on Windows.
      include: [/[\\/]src[\\/]react[\\/]/],
      // Pinned rather than defaulted, for the reason the playground pins it: the demo and the
      // package have to be compiled the same way or the demo stops being evidence.
      presets: [reactCompilerPreset({ target: '19' })],
    }),
    // Declarations are emitted by `tsc -p tsconfig.build.json` in the `build:esm` script,
    // not by a Vite plugin — see that file for why.
    stripJSDoc(),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        react: resolve(import.meta.dirname, 'src/react.ts'),
        solid: resolve(import.meta.dirname, 'src/solid.ts'),
        vanilla: resolve(import.meta.dirname, 'src/vanilla.ts'),
      },
      formats: ['es'],
    },

    rolldownOptions: {
      // Every optional peer stays external — bundling one would put a second copy of a
      // framework in a consumer's app, which for both React and Solid means two module-level
      // runtimes and nothing working.
      //
      // `react/compiler-runtime` is on the list because the compiler emits an import of it, and
      // it is React's own subpath: bundling it would inline React internals into this package and
      // hand a consumer a second `useMemoCache`. It is a subpath rather than a package, which is
      // exactly the kind of specifier a bare `id === 'react'` check misses.
      external: (id) => {
        return (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react/jsx-runtime' ||
          id === 'react/compiler-runtime' ||
          id === 'solid-js' ||
          id.startsWith('solid-js/')
        );
      },
      output: {
        preserveModules: true,
        entryFileNames: (chunkInfo) => {
          return `${chunkInfo.name.replace(/^src\//, '')}.js`;
        },
        exports: 'named',
      },
    },
    outDir: 'dist/esm',
    sourcemap: false,
    target: 'es2024',
    minify: false,
  },
});
