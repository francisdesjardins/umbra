// `umbra` — the library itself, framework-free. This is the module every microfrontend shares,
// and sharing it is the whole mechanism: `dialogManager` is a module-level singleton, so two
// copies would be two registries and `requestOpen` would never cross between them.
export * from '../../src/index.js';
