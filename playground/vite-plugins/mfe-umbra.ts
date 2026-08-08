import { rolldown } from 'rolldown';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED_ENTRY = resolve(HERE, '../mfe-src/shared.ts');
const LIB_ROOT = resolve(HERE, '../../src');

/** The one URL the microfrontend demo's import map points at. Relative, so it survives the
 *  hash-router build under `/playground/dialog/` as well as `/` in dev. */
const PUBLIC_PATH = '/mfe/umbra.mjs';
const ASSET_NAME = 'mfe/umbra.mjs';

/**
 * Serves what the microfrontend host distributes: one browser-loadable ES module carrying the
 * library, its React binding, and React itself.
 *
 * The page under `public/mfe/` is deliberately plain HTML and plain JS — no build step, no JSX,
 * an import map and two `<script type="module">`. For that to work, `umbra` has to resolve to a
 * real file a browser can fetch, so this bundles the entry on demand in dev and emits the same
 * file at build time.
 *
 * **One file on purpose.** `dialogManager` is a module-level singleton: two bundles that each
 * carried their own copy would each get their own registry, and a request from one microfrontend
 * would never reach a dialog owned by the other. Sharing it through the import map is what makes
 * the demo's central claim true rather than staged.
 */
export function mfeUmbraPlugin(): Plugin {
  let cached: string | null = null;

  const bundleShared = async (): Promise<string> => {
    const build = await rolldown({ input: SHARED_ENTRY });
    // Minified but still React's development build — 975 kB down to 215 kB, and the warnings
    // stay. Those warnings are part of what the demo teaches: spreading an action's `loading`
    // onto a bare `<button>` is reported there, not silently dropped.
    const { output } = await build.generate({ format: 'esm', minify: true });
    await build.close();
    // rolldown types the first output entry as the entry chunk, so there is nothing to narrow.
    const [chunk] = output;
    return chunk.code;
  };

  return {
    name: 'umbra:mfe-bundle',

    configureServer(server) {
      // Rebuild whenever the library changes, the way the API reference does.
      server.watcher.add(LIB_ROOT);
      server.watcher.on('change', (file) => {
        if (resolve(file).startsWith(LIB_ROOT)) {
          cached = null;
        }
      });

      server.middlewares.use(PUBLIC_PATH, (_request, response, next) => {
        void (async () => {
          try {
            cached ??= await bundleShared();
            response.setHeader('Content-Type', 'text/javascript');
            response.setHeader('Cache-Control', 'no-cache');
            response.end(cached);
          } catch (error) {
            next(error);
          }
        })();
      });
    },

    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: ASSET_NAME, source: await bundleShared() });
    },
  };
}
