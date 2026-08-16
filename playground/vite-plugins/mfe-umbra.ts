import { rolldown } from 'rolldown';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY_DIR = resolve(HERE, '../mfe-src');
const LIB_ROOT = resolve(HERE, '../../src');

/** Everything the host's import map names, and the module that answers for each. */
const ENTRIES = [
  'umbra',
  'umbra-react',
  'umbra-solid',
  'umbra-vanilla',
  'react',
  'react-dom-client',
  'solid-js',
  'solid-js-web',
  'solid-js-h',
] as const;

/** Where the frame fetches them from. Relative in the map, so the hash-router build works too. */
const PUBLIC_PREFIX = '/mfe/';

/**
 * Serves what the microfrontend host distributes: one browser-loadable ES module per specifier
 * its import map names, all built together so they share one copy of everything underneath.
 *
 * The page under `public/mfe/` is deliberately plain HTML and plain JS — no build step, no JSX,
 * an import map and three `<script type="module">`. For that to work, `umbra`, `umbra/react`,
 * `umbra/solid`, `react` and `solid-js` all have to resolve to real files a browser can fetch.
 *
 * **One build, not one file.** Code-splitting is what makes the demo's central claim true rather
 * than staged: the three microfrontends load different modules, but rolldown hoists everything
 * they have in common — the manager included — into a shared chunk that each entry imports. So
 * there is exactly one `dialogManager` on the page, and a request from the React microfrontend
 * reaches a dialog owned by the Solid one. Three separate builds would give three registries and
 * nothing would cross.
 */
export function mfeUmbraPlugin(): Plugin {
  let cached: Map<string, string> | null = null;

  const bundle = async (): Promise<Map<string, string>> => {
    const build = await rolldown({
      input: Object.fromEntries(
        ENTRIES.map((name) => {
          return [name, resolve(ENTRY_DIR, `${name}.ts`)];
        })
      ),
    });
    // Minified but still React's and Solid's development builds — the warnings stay, and they
    // are part of what the demo teaches: spreading an action's props onto a bare `<button>` is
    // reported there, not silently dropped.
    const { output } = await build.generate({
      format: 'esm',
      minify: true,
      entryFileNames: '[name].mjs',
      chunkFileNames: 'shared-[hash].mjs',
    });
    await build.close();

    const files = new Map<string, string>();
    for (const chunk of output) {
      if (chunk.type === 'chunk') {
        files.set(chunk.fileName, chunk.code);
      }
    }
    return files;
  };

  return {
    name: 'umbra:mfe-bundle',

    configureServer(server) {
      // Rebuild whenever the library or one of the entry modules changes, the way the API
      // reference does. `mfe-src/` is watched too: it is outside `src/`, so nothing else in the
      // dev server would notice an edit there and the frame would keep serving a stale bundle.
      server.watcher.add(LIB_ROOT);
      server.watcher.add(ENTRY_DIR);
      server.watcher.on('change', (file) => {
        const changed = resolve(file);
        if (changed.startsWith(LIB_ROOT) || changed.startsWith(ENTRY_DIR)) {
          cached = null;
        }
      });

      // Connect's handler signature, not ours — the three parameters are what `use` calls.
      // oxlint-disable-next-line max-params
      server.middlewares.use(PUBLIC_PREFIX, (request, response, next) => {
        // The chunk names are only known after a build, so anything that is not one of ours —
        // `host.html`, the microfrontend scripts, the favicon — has to fall through untouched.
        const name = (request.url ?? '').replace(/^\//, '').split('?')[0] ?? '';
        if (!name.endsWith('.mjs')) {
          next();
          return;
        }

        void (async () => {
          try {
            cached ??= await bundle();
            const code = cached.get(name);
            if (code === undefined) {
              next();
              return;
            }
            response.setHeader('Content-Type', 'text/javascript');
            response.setHeader('Cache-Control', 'no-cache');
            response.end(code);
          } catch (error) {
            next(error);
          }
        })();
      });
    },

    async generateBundle() {
      for (const [fileName, source] of await bundle()) {
        this.emitFile({ type: 'asset', fileName: `mfe/${fileName}`, source });
      }
    },
  };
}
