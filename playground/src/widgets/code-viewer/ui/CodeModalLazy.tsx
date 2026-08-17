import { lazy } from 'react';

/**
 * `CodeModalContent`, deferred: `useCodeModal` is called from `RootLayout`, so a static import would
 * land the syntax highlighter in the entry chunk for a panel that starts closed everywhere. Its own
 * file because a module exporting a component beside anything else loses fast refresh.
 */
export const CodeModalContent = lazy(() => {
  return import('@/widgets/code-viewer/ui/CodeModal').then((module) => {
    return { default: module.CodeModalContent };
  });
});
