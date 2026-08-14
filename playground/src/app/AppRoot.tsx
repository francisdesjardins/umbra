import { CodePaneProvider } from '@/app/providers/CodePaneProvider/CodePaneProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider/ThemeProvider';
import { RootLayout } from '@/widgets/root-layout';

/**
 * What surrounds the application, composed where composing it is the job.
 *
 * `RootLayout` is a **widget**: it renders the shell. Wrapping itself in two providers meant
 * reaching up into `app` for them, which inverts the layer order — so the providers live here and
 * the shell renders the shell.
 *
 * In its own file rather than in `router.tsx`, because a module that exports a component *and*
 * something else breaks Fast Refresh for the whole file: React cannot tell which export changed,
 * so it falls back to a full reload. `only-export-components` is the rule that says so, and it is
 * the reason this is three lines in a file of its own.
 */
export const AppRoot = () => {
  return (
    <ThemeProvider>
      <CodePaneProvider>
        <RootLayout />
      </CodePaneProvider>
    </ThemeProvider>
  );
};
