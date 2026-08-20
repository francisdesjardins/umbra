import { lazy } from 'react';

/**
 * `CodeBlock`, deferred: it pulls the syntax highlighter, and `useCodeModal` is called from
 * `RootLayout`, so a static path from there would land refractor in the entry chunk for a panel
 * that starts closed everywhere. Its own file because a module exporting a component beside
 * anything else loses fast refresh.
 */
export const CodeBlock = lazy(() => {
  return import('@/shared/ui/CodeBlock/CodeBlock').then((module) => {
    return { default: module.CodeBlock };
  });
});
