import react from '@vitejs/plugin-react';
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
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
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
      },
      formats: ['es'],
    },

    rollupOptions: {
      // Every optional peer stays external — bundling one would put a second copy of a
      // framework in a consumer's app, which for both React and Solid means two module-level
      // runtimes and nothing working.
      external: (id) => {
        return (
          id === 'react' ||
          id === 'react-dom' ||
          id === 'react/jsx-runtime' ||
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
