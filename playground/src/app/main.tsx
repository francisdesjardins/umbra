import '@/app/styles/app.css';

/**
 * Two doors, and neither loads the other's graph.
 *
 * `?gallery` is the component suite's: Playwright's `mount` fixture navigates here and calls
 * `window.mount(...)`, so the contract has to exist before anything of ours renders — installed
 * from an effect it arrives a commit too late. Both branches import **dynamically**, because a
 * static import runs whether or not its branch does: the router's graph reaching a test page is
 * how `ThemeProvider`'s module-level side effect ended up pinning a token the suite measures.
 */
if (new URLSearchParams(globalThis.location.search).has('gallery')) {
  // Assigned synchronously, while this module evaluates: the fixture checks for the pair as soon as
  // the page loads, and awaiting the import here hands it a page that defines them a tick too late.
  const loading = import('@/pages/stories/model/gallery');
  Object.assign(globalThis, {
    mount: async (params: { story: string; props?: Record<string, unknown> }) => {
      return (await loading).mount(params);
    },
    unmount: async () => {
      return (await loading).unmount();
    },
  });
} else {
  void import('@/app/bootstrap').then((app) => {
    app.bootstrap();
  });
}
