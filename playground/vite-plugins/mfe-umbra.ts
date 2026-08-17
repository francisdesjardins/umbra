import { rolldown } from 'rolldown';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY_DIR = resolve(HERE, '../mfe-src');
const LIB_ROOT = resolve(HERE, '../../src');
const PUBLIC_DIR = resolve(HERE, '../public/mfe');

/**
 * Frame sources as text, so the viewer shows the bytes the browser runs. `public/` is mounted at
 * `/` with no importable address: a relative `?raw` climb warns on every dev page load, the root
 * form fails the build (`UNRESOLVED_IMPORT`, public files being copied). Reading them here works.
 */
const VIRTUAL_SOURCES = 'virtual:mfe-sources';
const RESOLVED_SOURCES = `\0${VIRTUAL_SOURCES}`;

const SOURCE_FILES: Readonly<Record<string, string>> = {
  host: 'host.html',
  checkout: 'mfa1.js',
  billing: 'mfa2.js',
  support: 'mfa3.js',
  audit: 'mfa4.js',
};

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
 * One browser-loadable ES module per specifier the host's import map names. The `public/mfe/` page
 * is plain HTML and JS — no build step — so `umbra`, `umbra/react`, `umbra/solid`, `react` and
 * `solid-js` must resolve to fetchable files. One build, not three: rolldown hoists what the
 * entries share — the manager included — so one `dialogManager` serves the page and React's
 * microfrontend reaches a Solid-owned dialog; three builds would give three registries.
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
    // Minified but still the dev builds: their warnings (a spread onto a bare `<button>`) are taught.
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

    resolveId(id) {
      return id === VIRTUAL_SOURCES ? RESOLVED_SOURCES : null;
    },

    async load(id) {
      if (id !== RESOLVED_SOURCES) {
        return null;
      }
      const exports = await Promise.all(
        Object.entries(SOURCE_FILES).map(async ([name, file]) => {
          const text = await readFile(join(PUBLIC_DIR, file), 'utf8');
          // The module is virtual, so nothing else ties an edit here to the viewer in dev.
          this.addWatchFile(join(PUBLIC_DIR, file));
          return `export const ${name} = ${JSON.stringify(text)};`;
        })
      );
      return exports.join('\n');
    },

    configureServer(server) {
      // `mfe-src/` too: outside `src/`, so nothing else notices an edit and the bundle goes stale.
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
        // Chunk names are only known after a build, so everything else must fall through untouched.
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
