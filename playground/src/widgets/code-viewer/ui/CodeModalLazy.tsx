import { lazy } from 'react';

/**
 * `CodeModalContent`, deferred.
 *
 * `useCodeModal` is called from `RootLayout`, so anything it imports statically lands in the entry
 * chunk — and this component's subtree carries the syntax highlighter, for a panel that starts
 * closed on every route. The `lazy` call sits in a file of its own because a module that exports a
 * component beside anything else loses fast refresh.
 */
export const CodeModalContent = lazy(() => {
  return import('@/widgets/code-viewer/ui/CodeModal').then((module) => {
    return { default: module.CodeModalContent };
  });
});
