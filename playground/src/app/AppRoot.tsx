import { CodePaneProvider } from '@/app/providers/CodePaneProvider/CodePaneProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider/ThemeProvider';
import { RootLayout } from '@/widgets/root-layout';

/**
 * What surrounds the application, composed here because `RootLayout` is a widget and reaching up into
 * `app` for its providers inverts the layer order. Its own file rather than `router.tsx` because a
 * module exporting a component *and* anything else forces a full reload (`only-export-components`).
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
