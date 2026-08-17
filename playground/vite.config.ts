import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
// `.ts` and not extensionless: Vite's native config loader (the coming default) resolves the
// specifier as written, and `allowImportingTsExtensions` is what makes the compiler agree.
import { apiModelPlugin } from './vite-plugins/api-model.ts';
import { mfeUmbraPlugin } from './vite-plugins/mfe-umbra.ts';

// Set VITE_HASH_ROUTER=true to build for file:// (no server needed)
const hashRouter = process.env['VITE_HASH_ROUTER'] === 'true';

export default defineConfig({
  base: hashRouter ? './' : '/',
  plugins: [
    // Fast Refresh is kept off the modules a Worker imports. Its preamble reads `window`, which a
    // Worker has not got, so anything reaching `umbra/react` from one died on import — and `worker.
    // plugins` cannot answer for it, since in dev Vite serves a worker through this very pipeline.
    // Excluding costs nothing: the root `tsconfig.json` sets `jsx: react-jsx`, so esbuild still emits
    // the automatic runtime, and Fast Refresh over the library's own source is not what anyone edits.
    react({ exclude: [/src\/react\//, /ssr-worker/] }),
    babel({
      // Pinned, not defaulted: the library build and the component-test bundle both pass
      // `{ target: '19' }`, and a demo compiled under a different target would stop being
      // evidence of how the shipped code behaves. The plugin's own default matches today —
      // which is exactly the kind of agreement that breaks quietly.
      presets: [reactCompilerPreset({ target: '19' })],
    }),
    apiModelPlugin(),
    mfeUmbraPlugin(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      umbra: resolve(import.meta.dirname, '../src'),
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  optimizeDeps: {
    // Named up front rather than left to discovery. Vite pre-bundles a dependency the first time
    // it sees one imported, and discovering one mid-session re-runs the optimizer and reloads the
    // page — which lands, by construction, on the first visit to whichever section introduced it.
    // The highlighter's subpaths are here because `CodeBlock` reaches them past the package's own
    // entry, so nothing points at them until the code viewer is first opened.
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@tanstack/react-router',
      'immer',
      'react-syntax-highlighter/dist/esm/prism-light',
      'react-syntax-highlighter/dist/esm/languages/prism/bash',
      'react-syntax-highlighter/dist/esm/languages/prism/css',
      'react-syntax-highlighter/dist/esm/languages/prism/markup',
      'react-syntax-highlighter/dist/esm/languages/prism/tsx',
      'react-syntax-highlighter/dist/esm/styles/prism/one-dark',
      'react-syntax-highlighter/dist/esm/styles/prism/one-light',
    ],
    // The library is the source next door, not a dependency — pre-bundling it would freeze it
    // behind an optimizer cache and stop an edit in `src/` from showing up here.
    exclude: ['umbra'],
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
    // Transformed at startup rather than on the click that needs it. Each route is a lazy chunk,
    // so in dev its whole subtree — page, examples, templates — is transformed the first time it
    // is opened and instantly on every visit after: the lag is per section, once, which is
    // precisely the shape being complained about. Every page barrel is listed because a section
    // left off is a section that keeps its stall.
    warmup: {
      clientFiles: [
        './src/app/main.tsx',
        './src/app/router.tsx',
        './src/widgets/root-layout/ui/RootLayout.tsx',
        './src/pages/*/index.ts',
      ],
    },
    fs: {
      strict: false,
      allow: ['..'],
    },
  },
  preview: {
    port: 3000,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
  },
  build: {
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }
          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'vendor-mui';
          }
          if (
            id.includes('react-syntax-highlighter') ||
            id.includes('highlight.js') ||
            id.includes('refractor') ||
            id.includes('prismjs')
          ) {
            return 'vendor-syntax';
          }
          if (id.includes('@tanstack')) {
            return 'vendor-router';
          }
          return 'vendor-react';
        },
      },
    },
  },
});
