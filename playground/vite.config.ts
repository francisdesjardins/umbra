import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
// `.ts` and not extensionless: Vite's native config loader (the coming default) resolves the
// specifier as written, and `allowImportingTsExtensions` is what makes the compiler agree.
import { apiModelPlugin } from './vite-plugins/api-model.ts';

// Set VITE_HASH_ROUTER=true to build for file:// (no server needed)
const hashRouter = process.env['VITE_HASH_ROUTER'] === 'true';

export default defineConfig({
  base: hashRouter ? './' : '/',
  plugins: [
    react(),
    babel({
      // Pinned, not defaulted: the library build and the component-test bundle both pass
      // `{ target: '19' }`, and a demo compiled under a different target would stop being
      // evidence of how the shipped code behaves. The plugin's own default matches today —
      // which is exactly the kind of agreement that breaks quietly.
      presets: [reactCompilerPreset({ target: '19' })],
    }),
    apiModelPlugin(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      umbra: resolve(import.meta.dirname, '../src'),
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
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
