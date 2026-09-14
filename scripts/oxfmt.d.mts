/**
 * The formatter helper's shape, declared beside it rather than inferred.
 *
 * The module is `.mjs` because three of its four callers are the `scripts/` executables, which are
 * never compiled; the fourth is `compatibility-matrix.test.ts`, which the root `tsconfig` does
 * check — so without this it imports `formatAs` as an implicit `any`.
 */
export declare function formatAs(fileName: string, text: string): Promise<string>;
