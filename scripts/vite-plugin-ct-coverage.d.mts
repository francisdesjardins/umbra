import type { Plugin } from 'vite';

/**
 * The instrumenter's shape, declared beside it rather than inferred.
 *
 * The plugin is `.mjs` by design — it runs in Vite's own config load, before anything compiles it —
 * so a consumer importing it from a type-checked config had it as an implicit `any`. That was
 * invisible while only `playwright.config.ts` imported it, since the root `tsconfig` includes
 * `src/**` and nothing else; the playground's config *is* checked, and the move put it there.
 */
export declare function ctCoverage(): Plugin;
