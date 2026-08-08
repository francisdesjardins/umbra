/**
 * What the host distributes to its microfrontends — one module, one instance of everything.
 *
 * The import map points every microfrontend's `umbra` at the single file this entry produces.
 * That is the whole mechanism: `dialogManager` is a module-level singleton, so two bundles that
 * each carried their own copy would each get their own registry and `requestOpen` would never
 * find anything. Shared through the import map, they address one.
 *
 * React rides along for the same reason and no other: two copies of React mean two hook
 * dispatchers, so a React microfrontend needs *the* React the binding was built against. The
 * import map keeps the names honest by pointing `react` and `react-dom/client` at this file too —
 * nothing here is a library export, and a reader must not come away thinking `umbra` ships React.
 * The plain-JS microfrontend imports none of it.
 */
export * from '../../src/react.js';
export { createElement, useState } from 'react';
export { createRoot } from 'react-dom/client';
